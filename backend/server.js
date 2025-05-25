const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Telegraf, Markup } = require('telegraf');
const Order = require('./models/Order');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const ADMIN_ID = '7699555744';

const categories = {
  'Cock Rings & Toys': [
    { name: 'Cock Ring - Pack of 3', price: 80 },
    { name: 'Cock Ring Vibrator', price: 60 },
    { name: 'Spikey Jelly (Red)', price: 160 },
    { name: 'Spikey Jelly (Black)', price: 160 },
    { name: '"Th Bolitas" Jelly', price: 160 },
    { name: 'Portable Wired Vibrator Egg', price: 130 },
    { name: '7 Inches African Version Dildo', price: 270 },
    { name: 'Masturbator Cup', price: 120, variants: ['Yellow (Mouth)', 'Gray (Arse)', 'Black (Vagina)'] },
  ],
  'Lubes & Condoms': [
    { name: 'Monogatari Lube Tube', price: 120 },
    { name: 'Monogatari Lube Pinhole', price: 120 },
    { name: 'Monogatari Flavored Lube', price: 200, variants: ['Peach', 'Strawberry', 'Cherry'] },
    { name: 'Ultra thin 001 Condom', price: 90, variants: ['Black', 'Long Battle', 'Blue', 'Naked Pleasure', 'Granule Passion'] },
  ],
  'Performance Enhancers': [
    { name: 'Maxman per Tab', price: 40 },
    { name: 'Maxman per Pad', price: 400 },
  ],
  'Spicy Accessories': [
    { name: 'Delay Collar', price: 200 },
    { name: 'Delay Ejaculation Buttplug', price: 200 },
  ],
  'Essentials': [
    { name: 'Eucalyptus Menthol Food Grade', price: 0, variants: ['15-20 (1k)', '25-30 (1.5k)', '35-40 (2k)'] },
    { name: 'Mouth Fresheners', price: 90, variants: ['Peach', 'Mint'] },
    { name: 'Insulin Syringe', price: 20 },
    { name: 'Sterile Water for Injection', price: 15 },
  ],
};

const userCarts = {};
const userStates = {};
const userOrderData = {};
const qrPending = {};
const proofWaitList = {};

bot.start((ctx) => {
  const id = ctx.from.id.toString();
  userCarts[id] = [];
  userStates[id] = 'CATEGORY_SELECTION';
  ctx.reply('Welcome to Kutabare Online Shop! Pili ka muna ng category:', categoryButtons());
});

function categoryButtons() {
  return Markup.keyboard(Object.keys(categories).concat(['Checkout'])).resize();
}

function productButtons(category) {
  const items = categories[category];
  return Markup.keyboard(items.map(p => p.name).concat(['Back'])).resize();
}

bot.on('text', async (ctx) => {
  const id = ctx.from.id.toString();
  const text = ctx.message.text;
  const state = userStates[id] || 'CATEGORY_SELECTION';

  if (text === 'Back') {
    userStates[id] = 'CATEGORY_SELECTION';
    return ctx.reply('Balik sa categories:', categoryButtons());
  }

  if (text === 'Checkout') {
    if (!userCarts[id] || userCarts[id].length === 0) {
      return ctx.reply('Wala ka pang laman sa cart!');
    }
    userStates[id] = 'DELIVERY_OPTION';
    return ctx.reply('Pili ng delivery option:', Markup.keyboard(['Pick up', 'Same-day Delivery']).resize());
  }

  if (state === 'CATEGORY_SELECTION' && categories[text]) {
    userStates[id] = `PRODUCT_SELECTION:${text}`;
    return ctx.reply(`Pili ng product sa ${text}:`, productButtons(text));
  }

  if (state.startsWith('PRODUCT_SELECTION:')) {
    const category = state.split(':')[1];
    const products = categories[category];
    const selected = products.find(p => p.name === text);
    if (selected) {
      if (selected.variants) {
        userStates[id] = `VARIANT_SELECTION:${selected.name}:${category}`;
        return ctx.reply('Pili ng variant:', Markup.keyboard(selected.variants.concat(['Back'])).resize());
      } else {
        userCarts[id].push({ name: selected.name, price: selected.price });
        return ctx.reply(`${selected.name} added to cart!`, categoryButtons());
      }
    }
  }

  if (state.startsWith('VARIANT_SELECTION:')) {
    const [_, productName, category] = state.split(':');
    const product = categories[category].find(p => p.name === productName);
    if (product && product.variants.includes(text)) {
      userCarts[id].push({ name: `${productName} - ${text}`, price: product.price });
      userStates[id] = 'CATEGORY_SELECTION';
      return ctx.reply(`${productName} (${text}) added to cart!`, categoryButtons());
    }
  }

  if (state === 'DELIVERY_OPTION') {
    if (!['Pick up', 'Same-day Delivery'].includes(text)) return;
    userOrderData[id] = { deliveryOption: text };
    userStates[id] = 'AWAITING_CONTACT';
    return ctx.reply('Please enter your contact number:');
  }

  if (state === 'AWAITING_CONTACT') {
    const phone = text;
    const cart = userCarts[id];
    const deliveryOption = userOrderData[id].deliveryOption;
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const lines = cart.map(i => `• ${i.name} - ₱${i.price}`).join('\n');

    const newOrder = new Order({
      telegramId: id,
      items: cart,
      deliveryOption,
      contact: phone,
      status: 'Pending Payment',
    });
    await newOrder.save();

    ctx.reply(`Order placed! Total: ₱${total}\nWait for the QR code for payment.`);

    bot.telegram.sendMessage(ADMIN_ID,
      `New order received from @${ctx.from.username || ctx.from.first_name}:\n\n` +
      `${lines}\n\n` +
      `Delivery: ${deliveryOption}\nContact: ${phone}\nTotal: ₱${total}\n\n` +
      `Order ID: ${newOrder._id}`
    );

    qrPending[newOrder._id] = id;

    delete userCarts[id];
    delete userStates[id];
    delete userOrderData[id];
  }

  if (ctx.chat.id == ADMIN_ID && ctx.message.reply_to_message && ctx.message.photo) {
    const originalMessage = ctx.message.reply_to_message.text;
    const match = originalMessage.match(/Order ID: ([a-f0-9]+)/);
    if (match) {
      const orderId = match[1];
      const customerId = qrPending[orderId];
      if (customerId) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        await bot.telegram.sendPhoto(customerId, fileId, {
          caption: 'Ito na po ang payment QR code. Please send back your proof of payment photo after completing the transaction.',
        });
        proofWaitList[customerId] = orderId;
        delete qrPending[orderId];
        ctx.reply('QR sent to customer.');
      }
    }
  }

  if (ctx.message.photo && proofWaitList[id]) {
    const orderId = proofWaitList[id];
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

    const order = await Order.findById(orderId);
    if (order) {
      order.paymentProofFileId = fileId;
      order.status = 'Payment Received';
      await order.save();

      ctx.reply('Payment proof received! We will confirm and update you shortly.');
      bot.telegram.sendMessage(ADMIN_ID, `Proof of payment uploaded for order ID: ${orderId}`);
    }
    delete proofWaitList[id];
  }
});

app.get('/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

app.post('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  try {
    await bot.telegram.sendMessage(order.telegramId, `Order update:\nYour order status is now *${status}*.`, {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Failed to send Telegram message to customer:', err.message);
  }

  res.json(order);
});

bot.launch();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
