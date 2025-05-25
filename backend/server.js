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

bot.start(async (ctx) => {
  const id = ctx.from.id.toString();
  userCarts[id] = [];
  userStates[id] = 'CATEGORY_SELECTION';
  await ctx.reply('Welcome to Kutabare Online Shop! Pili ka muna ng category:', categoryInlineButtons());
});

function categoryInlineButtons() {
  // One button per row, with category name
  const buttons = Object.keys(categories).map(cat => [Markup.button.callback(cat, `category_${cat}`)]);
  // Add View Cart and Checkout buttons
  buttons.push([Markup.button.callback('🛒 View Cart', 'view_cart')]);
  buttons.push([Markup.button.callback('✅ Checkout', 'checkout')]);
  return Markup.inlineKeyboard(buttons);
}

function productInlineButtons(category) {
  const items = categories[category];
  const buttons = items.map(p => [Markup.button.callback(`${p.name} - ₱${p.price}`, `product_${category}_${p.name}`)]);
  buttons.push([Markup.button.callback('⬅️ Back to Categories', 'back_to_categories')]);
  buttons.push([Markup.button.callback('🛒 View Cart', 'view_cart')]);
  buttons.push([Markup.button.callback('✅ Checkout', 'checkout')]);
  return Markup.inlineKeyboard(buttons);
}

function variantInlineButtons(productName, category) {
  const product = categories[category].find(p => p.name === productName);
  if (!product || !product.variants) return null;
  const buttons = product.variants.map(v => [Markup.button.callback(v, `variant_${category}_${productName}_${v}`)]);
  buttons.push([Markup.button.callback('⬅️ Back to Products', `back_to_products_${category}`)]);
  return Markup.inlineKeyboard(buttons);
}

function cartSummary(id) {
  const cart = userCarts[id] || [];
  if (cart.length === 0) return 'Your cart is empty.';
  let total = 0;
  let summary = 'Your cart items:\n\n';
  cart.forEach((item, idx) => {
    summary += `${idx + 1}. ${item.name} - ₱${item.price}\n`;
    total += item.price;
  });
  summary += `\nTotal: ₱${total}`;
  return summary;
}

bot.action(/category_(.+)/, async (ctx) => {
  const category = ctx.match[1];
  const id = ctx.from.id.toString();
  userStates[id] = `PRODUCT_SELECTION:${category}`;
  await ctx.editMessageText(`Pili ng product sa ${category}:`, productInlineButtons(category));
});

bot.action(/product_(.+)_(.+)/, async (ctx) => {
  const category = ctx.match[1];
  const productName = ctx.match[2];
  const id = ctx.from.id.toString();
  const product = categories[category].find(p => p.name === productName);
  if (!product) return ctx.answerCbQuery('Product not found.');

  if (product.variants) {
    userStates[id] = `VARIANT_SELECTION:${productName}:${category}`;
    await ctx.editMessageText(`Pili ng variant para sa ${productName}:`, variantInlineButtons(productName, category));
  } else {
    userCarts[id].push({ name: productName, price: product.price });
    userStates[id] = 'CATEGORY_SELECTION';
    await ctx.editMessageText(`${productName} added to cart!`, categoryInlineButtons());
  }
  await ctx.answerCbQuery();
});

bot.action(/variant_(.+)_(.+)_(.+)/, async (ctx) => {
  const category = ctx.match[1];
  const productName = ctx.match[2];
  const variant = ctx.match[3];
  const id = ctx.from.id.toString();

  const product = categories[category].find(p => p.name === productName);
  if (!product || !product.variants.includes(variant)) {
    return ctx.answerCbQuery('Invalid variant.');
  }

  userCarts[id].push({ name: `${productName} - ${variant}`, price: product.price });
  userStates[id] = 'CATEGORY_SELECTION';
  await ctx.editMessageText(`${productName} (${variant}) added to cart!`, categoryInlineButtons());
  await ctx.answerCbQuery();
});

bot.action('back_to_categories', async (ctx) => {
  const id = ctx.from.id.toString();
  userStates[id] = 'CATEGORY_SELECTION';
  await ctx.editMessageText('Balik sa categories:', categoryInlineButtons());
  await ctx.answerCbQuery();
});

bot.action(/back_to_products_(.+)/, async (ctx) => {
  const category = ctx.match[1];
  const id = ctx.from.id.toString();
  userStates[id] = `PRODUCT_SELECTION:${category}`;
  await ctx.editMessageText(`Pili ng product sa ${category}:`, productInlineButtons(category));
  await ctx.answerCbQuery();
});

bot.action('view_cart', async (ctx) => {
  const id = ctx.from.id.toString();
  const summary = cartSummary(id);
  await ctx.answerCbQuery(); // remove loading
  await ctx.reply(summary);
});

bot.action('checkout', async (ctx) => {
  const id = ctx.from.id.toString();
  if (!userCarts[id] || userCarts[id].length === 0) {
    await ctx.answerCbQuery('Wala ka pang laman sa cart!');
    return;
  }
  userStates[id] = 'DELIVERY_OPTION';
  await ctx.editMessageText('Pili ng delivery option:', Markup.inlineKeyboard([
    [Markup.button.callback('Pick up', 'delivery_pickup')],
    [Markup.button.callback('Same-day Delivery', 'delivery_sameday')],
    [Markup.button.callback('⬅️ Back to Categories', 'back_to_categories')],
  ]));
  await ctx.answerCbQuery();
});

bot.action(/delivery_(.+)/, async (ctx) => {
  const id = ctx.from.id.toString();
  const deliveryOption = ctx.match[1] === 'pickup' ? 'Pick up' : 'Same-day Delivery';
  userOrderData[id] = { deliveryOption };
  userStates[id] = 'AWAITING_CONTACT';
  await ctx.editMessageText('Please enter your contact number:');
  await ctx.answerCbQuery();
});

// Handle plain text for contact number and proof photo, etc.
bot.on('text', async (ctx) => {
  const id = ctx.from.id.toString();
  const state = userStates[id] || 'CATEGORY_SELECTION';
  const text = ctx.message.text;

  if (state === 'AWAITING_CONTACT') {
    const phone = text.trim();
    const cart = userCarts[id] || [];
    const deliveryOption = userOrderData[id].deliveryOption;
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    if (cart.length === 0) {
      await ctx.reply('Your cart is empty.');
      userStates[id] = 'CATEGORY_SELECTION';
      return;
    }

    const newOrder = new Order({
      telegramId: id,
      items: cart,
      deliveryOption,
      contact: phone,
      status: 'Pending Payment',
    });
    await newOrder.save();

    const lines = cart.map(i => `• ${i.name} - ₱${i.price}`).join('\n');
    await ctx.reply(`Order placed! Total: ₱${total}\nWait for the QR code for payment.`);

    await bot.telegram.sendMessage(ADMIN_ID,
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
});

// Admin uploads QR code, sends to customer
bot.on('photo', async (ctx) => {
  const id = ctx.from.id.toString();
  if (ctx.chat.id.toString() === ADMIN_ID && ctx.message.reply_to_message) {
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
        await ctx.reply('QR sent to customer.');
      }
    }
  } else if (proofWaitList[id]) {
    // Customer sends proof of payment photo
    const orderId = proofWaitList[id];
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const order = await Order.findById(orderId);
    if (order) {
      order.paymentProofFileId = fileId;
      order.status = 'Payment Received';
      await order.save();

      await ctx.reply('Payment proof received! We will confirm and update you shortly.');
      await bot.telegram.sendMessage(ADMIN_ID, `Proof of payment uploaded for order ID: ${orderId}`);
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
