require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Telegraf } = require('telegraf');
const { getCategories, getProductList } = require('./data/products');

const app = express();
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;
const WEBHOOK_URL = `${process.env.WEBHOOK_BASE_URL}/bot${BOT_TOKEN}`;
const ADMIN_ID = Number(process.env.ADMIN_ID);

const bot = new Telegraf(BOT_TOKEN);
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));
bot.telegram.setWebhook(WEBHOOK_URL); // Webhook set once here

// In-memory store
const userStates = {}, userCarts = {}, userOrderData = {};

function findProductPrice(name) {
  const all = getCategories().flatMap(getProductList);
  const item = all.find(p => p.name === name);
  return item?.price || 0;
}

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
      text: p.name + (p.variants ? ' ▶' : ''),
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
    const buttons = prod.variants.map(v => [{ text: v, callback_data: `add_${name}_${v}` }]);
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
    if (!userCarts[id] || Object.keys(userCarts[id]).length === 0)
      return ctx.answerCbQuery('Empty cart.');
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
    return ctx.editMessageText('Pakibigay ng *contact info* (Name, Number, Address):', { parse_mode: 'Markdown' });
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
  if (userStates[id] !== 'awaiting_contact') return;
  userOrderData[id].contact = ctx.message.text;

  const cart = userCarts[id];
  const lines = Object.entries(cart).map(([k, q]) => {
    const [n, v] = k.split('_');
    return `${n} (${v}) x${q} - ₱${q * findProductPrice(n)}`;
  }).join('\n');

  const total = Object.entries(cart).reduce((sum, [k, q]) => {
    const [n] = k.split('_');
    return sum + q * findProductPrice(n);
  }, 0);

  const order = {
    telegramId: id,
    cart,
    contact: userOrderData[id].contact,
    delivery: userOrderData[id].delivery,
    total
  };

  try {
    await axios.post(`${BACKEND_URL}/api/orders`, order);
    await ctx.replyWithMarkdown(`✅ Order received!\nHintayin ang QR code for payment. Salamat boss!`);
    await bot.telegram.sendMessage(ADMIN_ID,
      `New order:\nTotal: ₱${total}\nContact: ${order.contact}\nDelivery: ${order.delivery}`
    );
    userCarts[id] = {};
    userOrderData[id] = {};
    userStates[id] = null;
  } catch (e) {
    console.error('Order error:', e.message);
    await ctx.reply('Order failed. Try again.');
  }
});

app.post('/payment-webhook', async (req, res) => {
  const { orderId, paymentStatus } = req.body;
  try {
    const { data: order } = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`);
    if (!order?.telegramId) return res.status(404).send('Not found');
    const msg = paymentStatus === 'paid'
      ? `✅ Bayad confirmed. Preparing na, boss!`
      : `❌ Payment failed. Try ulit.`;
    await bot.telegram.sendMessage(order.telegramId, msg);
    res.send('OK');
  } catch (e) {
    res.status(500).send('Error');
  }
});

// Final server start
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("PORT is not defined. This is required by Render.");
}

app.listen(PORT, () => {
  console.log(`Kutabare backend live on ${PORT}`);
});
});
