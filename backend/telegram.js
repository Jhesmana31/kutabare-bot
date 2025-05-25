const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { getCategories, getProductList } = require('./data/products');

const app = express();
app.use(bodyParser.json());

const bot = new TelegramBot('7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw', { webHook: true });
bot.setWebHook('https://kutabarebot.onrender.com/bot7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw');

const adminId = 7699555744;
const BACKEND_URL = 'https://kutabarebot-backend.onrender.com';

const userStates = {};
const userCarts = {};
const userOrderData = {};

function findProductPrice(name, variant = 'noVariant') {
  const all = getCategories().flatMap(cat => getProductList(cat));
  const product = all.find(p => p.name === name);
  return product ? product.price : 0;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;
  userOrderData[chatId] = {};
  bot.sendMessage(chatId, `Yo! Welcome sa *Kutabare Online Shop*! Pili na sa mga pampasarap, boss!`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 View Products', callback_data: 'view_products' }],
        [{ text: '📦 My Orders', callback_data: 'my_orders' }]
      ]
    }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'view_products') {
    const categoryButtons = getCategories().map(cat => [{ text: cat, callback_data: `cat_${cat}` }]);
    bot.sendMessage(chatId, 'Pili ka ng category:', {
      reply_markup: {
        inline_keyboard: [...categoryButtons, [{ text: '⬅ Back', callback_data: 'back_main' }]]
      }
    });
  } else if (data.startsWith('cat_')) {
    const category = data.replace('cat_', '');
    const products = getProductList(category);

    const productButtons = products.map(p => [{
      text: p.name + (p.variants ? ' ▶' : ''),
      callback_data: p.variants ? `variants_${p.name}` : `add_${p.name}_noVariant`
    }]);

    bot.sendMessage(chatId, `🧃 *${category}*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [...productButtons, [{ text: '⬅ Back to Categories', callback_data: 'view_products' }]]
      }
    });
  } else if (data.startsWith('variants_')) {
    const productName = data.replace('variants_', '');
    const allProducts = getCategories().flatMap(cat => getProductList(cat));
    const product = allProducts.find(p => p.name === productName);
    if (!product) return;

    const variantButtons = product.variants.map(v => [{
      text: v,
      callback_data: `add_${product.name}_${v}`
    }]);

    bot.sendMessage(chatId, `Pili ng variant for *${product.name}*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [...variantButtons, [{ text: '⬅ Back to Categories', callback_data: 'view_products' }]]
      }
    });
  } else if (data.startsWith('add_')) {
    const [_, name, variant] = data.split('_');
    const key = `${name}_${variant}`;
    userCarts[chatId] = userCarts[chatId] || {};
    userCarts[chatId][key] = (userCarts[chatId][key] || 0) + 1;

    bot.sendMessage(chatId, `✅ Added *${name}* (${variant}) to cart.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '🚚 Proceed to Checkout', callback_data: 'checkout' }]
        ]
      }
    });
  } else if (data === 'checkout') {
    const cart = userCarts[chatId];
    if (!cart || Object.keys(cart).length === 0) {
      return bot.sendMessage(chatId, 'Your cart is empty.');
    }

    userStates[chatId] = 'awaiting_delivery_option';
    bot.sendMessage(chatId, 'Pili ka ng delivery method:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Pickup', callback_data: 'delivery_pickup' }],
          [{ text: 'Same-day Delivery', callback_data: 'delivery_sdd' }]
        ]
      }
    });
  } else if (data.startsWith('delivery_')) {
    const option = data.replace('delivery_', '');
    userOrderData[chatId] = { ...userOrderData[chatId], delivery: option };
    userStates[chatId] = 'awaiting_contact';
    bot.sendMessage(chatId, 'Pakibigay ng contact info (Name, Number, Address):');
  } else if (data === 'back_main') {
    bot.sendMessage(chatId, 'Back to main menu', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '📦 My Orders', callback_data: 'my_orders' }]
        ]
      }
    });
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = userStates[chatId];
  if (state === 'awaiting_contact') {
    const contact = msg.text;
    userOrderData[chatId].contact = contact;

    const cart = userCarts[chatId];
    const summary = Object.entries(cart).map(([key, qty]) => {
      const [name, variant] = key.split('_');
      const price = findProductPrice(name, variant);
      return `${name} (${variant}) x${qty} - ₱${qty * price}`;
    }).join('\n');

    const total = Object.entries(cart).reduce((sum, [key, qty]) => {
      const [name, variant] = key.split('_');
      const price = findProductPrice(name, variant);
      return sum + qty * price;
    }, 0);

    const order = {
      telegramId: chatId,
      cart,
      contact,
      delivery: userOrderData[chatId].delivery,
      total
    };

    const orderRes = await axios.post(`${BACKEND_URL}/api/orders`, order);
    const { orderId, qrLink } = orderRes.data;

    await bot.sendMessage(chatId,
      `✅ *Order Summary:*\n\n${summary}\n\n*Total: ₱${total}*\n\n` +
      `Delivery: ${order.delivery}\nContact: ${contact}\n\n` +
      `Scan or tap the link below to pay:\n${qrLink}`, {
      parse_mode: 'Markdown'
    });

    await bot.sendMessage(adminId, `New order from @${msg.from.username || 'N/A'}\nOrder ID: ${orderId}\nTotal: ₱${total}`);

    userCarts[chatId] = {};
    userOrderData[chatId] = {};
    userStates[chatId] = null;
  }
});

// --- PAYMENT STATUS WEBHOOK ---
app.post('/payment-webhook', async (req, res) => {
  const { orderId, paymentStatus } = req.body;
  try {
    const orderRes = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`);
    const order = orderRes.data;

    if (!order || !order.telegramId) return res.status(404).send('Not found');

    const chatId = order.telegramId;
    let statusMsg = 'Payment status updated.';

    if (paymentStatus === 'paid') {
      statusMsg = `✅ Bayad confirmed, boss! Preparing na order mo.\nSalamat sa Kutabare Online Shop!`;
    } else if (paymentStatus === 'failed') {
      statusMsg = `❌ Payment failed. Try ulit or contact us.`;
    }

    await bot.sendMessage(chatId, statusMsg);
    res.status(200).send('Notification sent');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// --- EXPRESS START ---
app.listen(process.env.PORT || 3000, () => {
  console.log('Bot server running...');
});
