const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const Order = require('./models/Order');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);

const userCarts = {};
const userStates = {};
const userOrderData = {};
const proofWaitList = {};
const qrPending = {};

const ADMIN_ID = process.env.ADMIN_ID;

// Helper function: validate phone number (digits only, optional leading +)
function isValidPhoneNumber(text) {
  return /^(\+?\d{7,15})$/.test(text.trim());
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Categories and products list
const categories = [
  { key: 'CockRings', label: 'Cock Rings & Toys' },
  { key: 'LubesCondoms', label: 'Lubes & Condoms' },
  { key: 'Performance', label: 'Performance Enhancers' },
  { key: 'Spicy', label: 'Spicy Accessories' },
  { key: 'Essentials', label: 'Essentials' },
];

// Your full product list with variants where applicable
const sampleProducts = {
  CockRings: [
    'Cock Ring - Pack of 3 - ₱80',
    'Cock Ring Vibrator - ₱60',
    'Spikey Jelly (Red) - ₱160',
    'Spikey Jelly (Black) - ₱160',
    '"Th Bolitas" Jelly - ₱160',
    'Portable Wired Vibrator Egg - ₱130',
    '7 Inches African Version Dildo - ₱270',
    'Delay Collar - ₱200',
    'Delay Ejaculation Buttplug - ₱200',
  ],
  LubesCondoms: [
    'Monogatari Lube Tube - ₱120',
    'Monogatari Lube Pinhole - ₱120',
    'Monogatari Flavored Lube (Peach) - ₱200',
    'Monogatari Flavored Lube (Strawberry) - ₱200',
    'Monogatari Flavored Lube (Cherry) - ₱200',
    'Ultra thin 001 Condom (Black) - ₱90',
    'Ultra thin 001 Condom (Long Battle) - ₱90',
    'Ultra thin 001 Condom (Blue) - ₱90',
    'Ultra thin 001 Condom (Naked Pleasure) - ₱90',
    'Ultra thin 001 Condom (Granule Passion) - ₱90',
    'Mouth Fresheners (Peach) - ₱90',
    'Mouth Fresheners (Mint) - ₱90',
  ],
  Performance: [
    'Maxman per Tab - ₱40',
    'Maxman per Pad (₱50 discount) - ₱400',
  ],
  Spicy: [
    'Eucalyptus Menthol Food Grade (15-20) - ₱1000',
    'Eucalyptus Menthol Food Grade (25-30) - ₱1500',
    'Eucalyptus Menthol Food Grade (35-40) - ₱2000',
  ],
  Essentials: [
    'Insulin Syringe - ₱20 each',
    'Sterile Water for Injection - ₱15',
    'Masturbator Cup (Yellow - Mouth) - ₱120',
    'Masturbator Cup (Gray - Arse) - ₱120',
    'Masturbator Cup (Black - Vagina) - ₱120',
  ],
};

// /start command
bot.start(ctx => {
  ctx.reply('Welcome to Kutabare Online Shop! Type /order to start shopping.');
});

// /order command - show categories inline keyboard
bot.command('order', async ctx => {
  userCarts[ctx.from.id] = {};
  userStates[ctx.from.id] = 'selecting_category';

  const buttons = categories.map(cat => [{ text: cat.label, callback_data: `category_${cat.key}` }]);

  await ctx.reply('Please choose a category:', {
    reply_markup: { inline_keyboard: buttons },
  });
});

// /viewcart command to show current cart contents
bot.command('viewcart', ctx => {
  const id = ctx.from.id;
  const cart = userCarts[id];
  if (!cart || Object.keys(cart).length === 0) {
    return ctx.reply('Your cart is empty. Add some products first!');
  }
  const lines = Object.entries(cart).map(([name, qty]) => `${qty}x ${name}`).join('\n');
  ctx.reply(`Your cart:\n${lines}\n\nTo remove an item, type "Remove <product name>"`);
});

// Remove item from cart by text "Remove <product>"
bot.hears(/^Remove (.+)$/i, ctx => {
  const id = ctx.from.id;
  const cart = userCarts[id];
  if (!cart) return ctx.reply('You have no items in cart.');

  const product = ctx.match[1].trim();
  if (!cart[product]) return ctx.reply(`Product "${product}" not found in your cart.`);

  delete cart[product];
  ctx.reply(`Removed "${product}" from your cart.`);
});

// Handle callback queries for categories, products, checkout, back
bot.on('callback_query', async ctx => {
  const data = ctx.callbackQuery.data;
  const id = ctx.from.id;

  // Select category
  if (data.startsWith('category_')) {
    const categoryKey = data.split('category_')[1];
    userStates[id] = 'selecting_product';
    userOrderData[id] = userOrderData[id] || {};
    userOrderData[id].category = categoryKey;

    const items = sampleProducts[categoryKey] || [];
    const buttons = items.map(item => [{ text: item, callback_data: `product_${item}` }]);
    buttons.push([{ text: 'Back to Categories', callback_data: 'back_to_categories' }]);
    buttons.push([{ text: 'Checkout', callback_data: 'checkout' }]);

    await ctx.editMessageText('Select a product:', {
      reply_markup: { inline_keyboard: buttons },
    });
    await ctx.answerCbQuery();
    return;
  }

  // Back to categories
  if (data === 'back_to_categories') {
    userStates[id] = 'selecting_category';
    const buttons = categories.map(cat => [{ text: cat.label, callback_data: `category_${cat.key}` }]);
    await ctx.editMessageText('Choose another category:', {
      reply_markup: { inline_keyboard: buttons },
    });
    await ctx.answerCbQuery();
    return;
  }

  // Add product to cart
  if (data.startsWith('product_')) {
    const product = data.split('product_')[1];
    userCarts[id] = userCarts[id] || {};
    userCarts[id][product] = (userCarts[id][product] || 0) + 1;
    await ctx.answerCbQuery(`${product} added to cart!`);
    return;
  }

  // Checkout pressed - ask delivery option
  if (data === 'checkout') {
    const cart = userCarts[id] || {};
    if (Object.keys(cart).length === 0) {
      await ctx.answerCbQuery('Cart is empty! Add products first.');
      return;
    }
    userStates[id] = 'collecting_delivery';

    // Delivery options as inline buttons
    await ctx.editMessageText('Select delivery option:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Pick up', callback_data: 'delivery_pickup' }],
          [{ text: 'Same-day delivery', callback_data: 'delivery_sameday' }],
          [{ text: 'Back to Categories', callback_data: 'back_to_categories' }],
        ],
      },
    });
    await ctx.answerCbQuery();
    return;
  }

  // Handle delivery option
  if (data.startsWith('delivery_') && userStates[id] === 'collecting_delivery') {
    const deliveryOption = data.split('delivery_')[1];
    userOrderData[id].deliveryOption = deliveryOption;
    userStates[id] = 'collecting_contact';

    // Instead of native share contact, ask user to type their number
    await bot.telegram.sendMessage(id, 'Please type your contact number (e.g., 09171234567 or +639171234567):');
    await ctx.answerCbQuery();
    return;
  }
});

// Handle text input for contact number (instead of native share contact)
bot.on('text', async ctx => {
  const id = ctx.from.id;

  if (userStates[id] === 'collecting_contact') {
    const phone = ctx.message.text.trim();

    if (!isValidPhoneNumber(phone)) {
      return ctx.reply('Invalid phone number format. Please enter a valid number (digits only, optional leading +).');
    }

    userOrderData[id].contact = phone;

    const cart = userCarts[id] || {};
    const orderData = {
      telegramId: id,
      items: Object.entries(cart).map(([name, qty]) => ({ name, quantity: qty })),
      contact: phone,
      deliveryOption: userOrderData[id].deliveryOption,
    };

    let total = 0;
    for (const [name, qty] of Object.entries(cart)) {
      const priceMatch = name.match(/₱(\d+)/);
      const price = priceMatch ? parseInt(priceMatch[1]) : 0;
      total += price * qty;
    }

    const lines = orderData.items.map(i => `${i.quantity}x ${i.name}`).join('\n');

    const newOrder = new Order(orderData);
    await newOrder.save();

    await ctx.replyWithMarkdown(
      `✅ Order received!\n\n*Summary:*\n${lines}\n\n*Total:* ₱${total}\n\n` +
      `Hintayin ang QR code for payment. Salamat boss!`
    );

    await bot.telegram.sendMessage(ADMIN_ID,
      `New order:\nOrder ID: ${newOrder._id}\nTotal: ₱${total}\nContact: ${phone}\nDelivery: ${orderData.deliveryOption}\n\n` +
      `Upload QR by replying with a photo and caption: QR:${newOrder._id}`
    );

    qrPending[newOrder._id] = id;
    userCarts[id] = {};
    userOrderData[id] = {};
    userStates[id] = null;

  } else {
    // Allow other messages to continue normal flow
    // or you can handle other commands here if needed
  }
});

// Remove old contact handler (for native Telegram contact sharing) - no longer used

// Handle photos for QR and proof as before (no change needed)
bot.on('photo', async ctx => {
  const id = ctx.chat.id;

  // ADMIN uploads QR code with caption "QR:"
  if (id == ADMIN_ID && ctx.message.caption?.startsWith('QR:')) {
    const orderId = ctx.message.caption.split('QR:')[1].trim();
    const order = await Order.findById(orderId);
    if (!order) return ctx.reply('Invalid order ID');

    const fileId = ctx.message.photo.pop().file_id;
    await bot.telegram.sendPhoto(order.telegramId, fileId, {
      caption: 'Eto na ang QR boss. Send proof after bayad.',
    });

    proofWaitList[order.telegramId] = orderId;
    return ctx.reply('QR sent to customer. Awaiting proof.');
  }

  // CUSTOMER uploads proof
  if (proofWaitList[id]) {
    const orderId = proofWaitList[id];
    const fileId = ctx.message.photo.pop().file_id;
    const order = await Order.findById(orderId);
    if (!order) return ctx.reply('Invalid order.');

    order.proofImage = fileId;
    order.status = 'Pending Confirmation';
    await order.save();

    await ctx.reply('Proof received! Wait for confirmation.');
    await bot.telegram.sendMessage(ADMIN_ID, `Proof submitted for order ${orderId}.`);
    delete proofWaitList[id];
  }
});

bot.launch();

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
