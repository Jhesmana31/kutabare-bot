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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// BOT COMMANDS

bot.start(ctx => {
  ctx.reply('Welcome to Kutabare Online Shop! Type /order to start shopping.');
});

bot.command('order', ctx => {
  const id = ctx.chat.id;
  userCarts[id] = {};
  userStates[id] = 'selecting_category';
  ctx.reply('Please choose a category:', {
    reply_markup: {
      keyboard: [
        ['Cock Rings & Toys', 'Lubes & Condoms'],
        ['Performance Enhancers', 'Spicy Accessories'],
        ['Essentials'],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

bot.hears(['Cock Rings & Toys', 'Lubes & Condoms', 'Performance Enhancers', 'Spicy Accessories', 'Essentials'], ctx => {
  const id = ctx.chat.id;
  userStates[id] = 'selecting_product';
  userOrderData[id] = userOrderData[id] || {};
  userOrderData[id].category = ctx.message.text;

  // Normally you'd fetch from DB based on category
  const sampleProducts = {
    'Cock Rings & Toys': ['Cock Ring - ₱80', 'Cock Ring Vibrator - ₱60'],
    'Lubes & Condoms': ['Monogatari Lube - ₱120', '001 Condom - ₱90'],
    'Performance Enhancers': ['Maxman Tab - ₱40'],
    'Spicy Accessories': ['Delay Plug - ₱200'],
    'Essentials': ['Insulin Syringe - ₱20'],
  };

  const items = sampleProducts[ctx.message.text] || [];
  const buttons = items.map(item => [item]);
  buttons.push(['Back to Categories', 'Checkout']);

  ctx.reply('Select a product:', {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
    },
  });
});

bot.hears('Back to Categories', ctx => {
  userStates[ctx.chat.id] = 'selecting_category';
  ctx.reply('Choose another category:', {
    reply_markup: {
      keyboard: [
        ['Cock Rings & Toys', 'Lubes & Condoms'],
        ['Performance Enhancers', 'Spicy Accessories'],
        ['Essentials'],
      ],
      resize_keyboard: true,
    },
  });
});

bot.hears('Checkout', async ctx => {
  const id = ctx.chat.id;
  const cart = userCarts[id] || {};
  const items = Object.entries(cart);
  if (!items.length) return ctx.reply('Cart is empty. Add products first.');

  const lines = items.map(([name, qty]) => `${qty}x ${name}`).join('\n');
  ctx.reply(`Items:\n${lines}\n\nSend your delivery option:\n- Pick up\n- Same-day delivery`);
  userStates[id] = 'collecting_delivery';
});

bot.on('text', async ctx => {
  const id = ctx.chat.id;
  const state = userStates[id];
  const text = ctx.message.text;

  if (state === 'selecting_product') {
    if (text === 'Checkout' || text === 'Back to Categories') return;

    const name = text.split(' - ')[0];
    userCarts[id] = userCarts[id] || {};
    userCarts[id][name] = (userCarts[id][name] || 0) + 1;

    return ctx.reply(`${name} added! Type more or press Checkout.`);
  }

  if (state === 'collecting_delivery') {
    userOrderData[id].deliveryOption = text;
    userStates[id] = 'collecting_contact';
    return ctx.reply('Send your contact number:');
  }

  if (state === 'collecting_contact') {
    userOrderData[id].contact = text;

    const cart = userCarts[id] || {};
    const orderData = {
      telegramId: id,
      items: Object.entries(cart).map(([name, qty]) => ({ name, quantity: qty })),
      contact: userOrderData[id].contact,
      deliveryOption: userOrderData[id].deliveryOption,
    };

    const total = Object.values(cart).reduce((acc, qty, i) => acc + qty * 100, 0);
    const lines = orderData.items.map(i => `${i.quantity}x ${i.name}`).join('\n');

    const newOrder = new Order(orderData);
    await newOrder.save();

    await ctx.replyWithMarkdown(
      `✅ Order received!\n\n*Summary:*\n${lines}\n\n*Total:* ₱${total}\n\n` +
      `Hintayin ang QR code for payment. Salamat boss!`
    );

    await bot.telegram.sendMessage(ADMIN_ID,
      `New order:\nOrder ID: ${newOrder._id}\nTotal: ₱${total}\nContact: ${orderData.contact}\nDelivery: ${orderData.deliveryOption}\n\n` +
      `Upload QR by replying with a photo and caption: QR:${newOrder._id}`
    );

    qrPending[newOrder._id] = id;
    userCarts[id] = {};
    userOrderData[id] = {};
    userStates[id] = null;
  }
});

bot.on('photo', async ctx => {
  const id = ctx.chat.id;

  // ADMIN uploads QR
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

// START BOT
bot.launch();
app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
