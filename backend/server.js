require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const { getCategories, getProductList } = require('./data/products');
const ordersRouter = require('./routes/orders');
const Order = require('./models/order');

const app = express();
app.use(bodyParser.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Order model
const OrderSchema = new mongoose.Schema({
  telegramId: Number,
  items: [{
    name: String,
    variant: String,
    quantity: Number
  }],
  contact: String,
  deliveryOption: String,
  total: Number,
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', OrderSchema);

const BOT_TOKEN = process.env.BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;
const WEBHOOK_URL = `${process.env.WEBHOOK_BASE_URL}/bot${BOT_TOKEN}`;
const ADMIN_ID = Number(process.env.ADMIN_ID);

const bot = new Telegraf(BOT_TOKEN);
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));
bot.telegram.setWebhook(WEBHOOK_URL);

// In-memory user data stores
const userStates = {};
const userCarts = {};
const userOrderData = {};

// Helpers
function findProductPrice(name) {
  const all = getCategories().flatMap(getProductList);
  const item = all.find(p => p.name === name);
  return item?.price || 0;
}

// Bot handlers
bot.start(ctx => {
  const id = ctx.chat.id;
  userStates[id] = null;
  userOrderData[id] = {};
  ctx.replyWithMarkdown(`Yo! Welcome sa *Kutabare Online Shop*!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 View Products', callback_data: 'view_products' }],
        [{ text: '📦 My Orders', callback_data: 'my_orders' }]
      ]
    }
  });
});

bot.on('callback_query', async ctx => {
  const id = ctx.chat.id;
  const data = ctx.callbackQuery.data;

  if (data === 'view_products') {
    const buttons = getCategories().map(c => [{ text: c, callback_data: `cat_${c}` }]);
    return ctx.editMessageText('Pili ka ng category:', {
      reply_markup: { inline_keyboard: [...buttons, [{ text: '⬅ Back', callback_data: 'back_main' }]] }
    });
  }

  if (data.startsWith('cat_')) {
    const cat = data.replace('cat_', '');
    const items = getProductList(cat);
    const buttons = items.map(p => [{
      text: `${p.name} - ₱${p.price}${p.variants ? ' ▶' : ''}`,
      callback_data: p.variants ? `variants_${p.name}` : `add_${p.name}_noVariant`
    }]);
    return ctx.editMessageText(`🧃 *${cat}*`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [...buttons, [{ text: '⬅ Back', callback_data: 'view_products' }]] }
    });
  }

  if (data.startsWith('variants_')) {
    const name = data.replace('variants_', '');
    const all = getCategories().flatMap(getProductList);
    const prod = all.find(p => p.name === name);
    const price = prod?.price || 0;
    const buttons = prod.variants.map(v => [{ text: `${v} - ₱${price}`, callback_data: `add_${name}_${v}` }]);
    return ctx.editMessageText(`Pili ng variant for *${name}*`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [...buttons, [{ text: '⬅ Back', callback_data: 'view_products' }]] }
    });
  }

  if (data.startsWith('add_')) {
    const [_, name, variant] = data.split('_');
    const key = `${name}_${variant}`;
    userCarts[id] = userCarts[id] || {};
    userCarts[id][key] = (userCarts[id][key] || 0) + 1;

    await ctx.answerCbQuery(`✅ Added ${name} (${variant})`);
    return ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [{ text: '🛒 View Products', callback_data: 'view_products' }],
        [{ text: '🚚 Checkout', callback_data: 'checkout' }]
      ]
    });
  }

  if (data === 'checkout') {
    if (!userCarts[id] || Object.keys(userCarts[id]).length === 0) {
      return ctx.answerCbQuery('Empty cart.');
    }
    userStates[id] = 'awaiting_delivery_option';
    return ctx.editMessageText('Pili ng delivery method:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Pickup', callback_data: 'delivery_pickup' }],
          [{ text: 'Same-day Delivery', callback_data: 'delivery_sdd' }]
        ]
      }
    });
  }

  if (data.startsWith('delivery_')) {
    userOrderData[id].delivery = data.split('_')[1];
    userStates[id] = 'awaiting_contact';
    return ctx.editMessageText('Pakibigay ng *contact info* (Name, Number, Address):', {
      parse_mode: 'Markdown'
    });
  }

  if (data === 'back_main') {
    return ctx.editMessageText('Back to main menu', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '📦 My Orders', callback_data: 'my_orders' }]
        ]
      }
    });
  }

  await ctx.answerCbQuery();
});

bot.on('message', async ctx => {
  const id = ctx.chat.id;

  if (userStates[id] !== 'awaiting_contact') return; // only handle contact info here

  userOrderData[id].contact = ctx.message.text;

  const cart = userCarts[id];
  if (!cart || Object.keys(cart).length === 0) {
    await ctx.reply('Your cart is empty. Please add products first.');
    userStates[id] = null;
    return;
  }

  const lines = Object.entries(cart).map(([key, qty]) => {
    const [name, variant] = key.split('_');
    const price = findProductPrice(name);
    return `${name} (${variant}) x${qty} - ₱${qty * price}`;
  }).join('\n');

  const total = Object.entries(cart).reduce((sum, [key, qty]) => {
    const [name] = key.split('_');
    return sum + qty * findProductPrice(name);
  }, 0);

  const orderData = {
    telegramId: id,
    items: Object.entries(cart).map(([key, qty]) => {
      const [name, variant] = key.split('_');
      return { name, variant, quantity: qty };
    }),
    contact: userOrderData[id].contact,
    deliveryOption: userOrderData[id].delivery || 'Pickup',
    total
  };

  try {
    // Save order to MongoDB
    const newOrder = new Order(orderData);
    await newOrder.save();

    // Notify user
    await ctx.replyWithMarkdown(
      `✅ Order received!\n\n*Summary:*\n${lines}\n\n*Total:* ₱${total}\n\n` +
      `Hintayin ang QR code for payment. Salamat boss!`
    );

    // Notify admin
    await bot.telegram.sendMessage(ADMIN_ID,
      `New order:\nTotal: ₱${total}\nContact: ${orderData.contact}\nDelivery: ${orderData.deliveryOption}`
    );

    // Reset user session data
    userCarts[id] = {};
    userOrderData[id] = {};
    userStates[id] = null;

  } catch (error) {
    console.error('Error saving order:', error);
    await ctx.reply('Order failed. Try again.');
  }
});

// Use orders router
app.use('/api/orders', ordersRouter);

// Start server
const PORT = process.env.PORT;
if (!PORT) throw new Error('PORT is not defined');

app.listen(PORT, () => {
  console.log(`Kutabare backend live on ${PORT}`);
});
