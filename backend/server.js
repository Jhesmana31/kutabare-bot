const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Telegraf, Markup } = require('telegraf');
const Order = require('./models/Order');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

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

// Helper: generate category inline keyboard
function categoryInlineKeyboard() {
  return Markup.inlineKeyboard(
    Object.keys(categories).map(cat => Markup.button.callback(cat, `cat_${cat}`))
  );
}

// Helper: generate product inline keyboard for a category
function productInlineKeyboard(category) {
  const buttons = categories[category].map(p => Markup.button.callback(p.name, `prod_${category}|${p.name}`));
  buttons.push(Markup.button.callback('Back', 'back_to_categories'));
  return Markup.inlineKeyboard(buttons, { columns: 2 });
}

// Helper: generate variant inline keyboard for a product
function variantInlineKeyboard(category, productName) {
  const product = categories[category].find(p => p.name === productName);
  if (!product || !product.variants) return null;
  const buttons = product.variants.map(v => Markup.button.callback(v, `variant_${category}|${productName}|${v}`));
  buttons.push(Markup.button.callback('Back', `prodback_${category}`));
  return Markup.inlineKeyboard(buttons, { columns: 2 });
}

// Helper: generate checkout inline keyboard
function checkoutInlineKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Pick up', 'delivery_pickup'),
    Markup.button.callback('Same-day Delivery', 'delivery_sameday'),
    Markup.button.callback('Back', 'back_to_categories')
  ], { columns: 2 });
}

bot.start(async (ctx) => {
  const id = ctx.from.id.toString();
  userCarts[id] = [];
  userStates[id] = 'CATEGORY_SELECTION';
  await ctx.reply('Welcome to Kutabare Online Shop! Pili ka muna ng category:', categoryInlineKeyboard());
});

bot.on('callback_query', async (ctx) => {
  const id = ctx.from.id.toString();
  const data = ctx.callbackQuery.data;
  const state = userStates[id] || 'CATEGORY_SELECTION';

  // Handle back to categories
  if (data === 'back_to_categories') {
    userStates[id] = 'CATEGORY_SELECTION';
    await ctx.editMessageText('Balik sa categories:', categoryInlineKeyboard());
    return ctx.answerCbQuery();
  }

  // Category selected
  if (data.startsWith('cat_')) {
    const category = data.slice(4);
    if (!categories[category]) return ctx.answerCbQuery('Invalid category.');
    userStates[id] = `PRODUCT_SELECTION:${category}`;
    await ctx.editMessageText(`Pili ng product sa ${category}:`, productInlineKeyboard(category));
    return ctx.answerCbQuery();
  }

  // Back to products from variants
  if (data.startsWith('prodback_')) {
    const category = data.slice(8);
    if (!categories[category]) return ctx.answerCbQuery('Invalid category.');
    userStates[id] = `PRODUCT_SELECTION:${category}`;
    await ctx.editMessageText(`Pili ng product sa ${category}:`, productInlineKeyboard(category));
    return ctx.answerCbQuery();
  }

  // Product selected
  if (data.startsWith('prod_')) {
    const [_, payload] = data.split('_');
    const [category, productName] = payload.split('|');
    const product = categories[category]?.find(p => p.name === productName);
    if (!product) return ctx.answerCbQuery('Invalid product.');

    if (product.variants) {
      userStates[id] = `VARIANT_SELECTION:${category}|${productName}`;
      await ctx.editMessageText('Pili ng variant:', variantInlineKeyboard(category, productName));
      return ctx.answerCbQuery();
    } else {
      userCarts[id].push({ name: product.name, price: product.price });
      userStates[id] = 'CATEGORY_SELECTION';
      await ctx.editMessageText(`${product.name} added to cart!`, categoryInlineKeyboard());
      return ctx.answerCbQuery('Added to cart!');
    }
  }

  // Variant selected
  if (data.startsWith('variant_')) {
    const [_, payload] = data.split('_');
    const [category, productName, variant] = payload.split('|');
    const product = categories[category]?.find(p => p.name === productName);
    if (!product || !product.variants.includes(variant)) return ctx.answerCbQuery('Invalid variant.');

    userCarts[id].push({ name: `${productName} - ${variant}`, price: product.price });
    userStates[id] = 'CATEGORY_SELECTION';
    await ctx.editMessageText(`${productName} (${variant}) added to cart!`, categoryInlineKeyboard());
    return ctx.answerCbQuery('Added to cart!');
  }

  // Delivery options
  if (data === 'delivery_pickup' || data === 'delivery_sameday') {
    if (!userCarts[id] || userCarts[id].length === 0) {
      userStates[id] = 'CATEGORY_SELECTION';
      await ctx.editMessageText('Wala ka pang laman sa cart! Balik sa categories:', categoryInlineKeyboard());
      return ctx.answerCbQuery();
    }
    const deliveryOption = data === 'delivery_pickup' ? 'Pick up' : 'Same-day Delivery';
    userOrderData[id] = { deliveryOption };
    userStates[id] = 'AWAITING_CONTACT';
    await ctx.editMessageText(`Pili ng delivery option: ${deliveryOption}\n\nPlease enter your contact number:`);
    return ctx.answerCbQuery();
  }

  ctx.answerCbQuery();
});

bot.on('text', async (ctx) => {
  const id = ctx.from.id.toString();
  const text = ctx.message.text;
  const state = userStates[id] || 'CATEGORY_SELECTION';

  if (text.toLowerCase() === 'checkout') {
    if (!userCarts[id] || userCarts[id].length === 0) {
      return ctx.reply('Wala ka pang laman sa cart!');
    }
    userStates[id] = 'DELIVERY_OPTION';
    return ctx.reply('Pili ng delivery option:', checkoutInlineKeyboard());
  }

  if (state === 'AWAITING_CONTACT') {
    const phone = text.trim();
    if (!phone.match(/^\+?\d{7,15}$/)) {
      return ctx.reply('Invalid contact number. Please enter a valid phone number:');
    }
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

    return;
  }

  // Other text inputs ignored or fallback
});

bot.on('message', async (ctx) => {
  const id = ctx.from.id.toString();

  // Handle admin uploading QR code in reply to order message
  if (ctx.chat.id.toString() === ADMIN_ID && ctx.message.reply_to_message && ctx.message.photo) {
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
        return ctx.reply('QR sent to customer.');
      }
    }
  }

  // Handle customer sending proof of payment photo
  if (ctx.message.photo && proofWaitList[id]) {
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
    await bot.telegram.sendMessage(order.telegramId, `Order update:\nYour order status is now *${status}*.`, { parse_mode: 'Markdown' });
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
