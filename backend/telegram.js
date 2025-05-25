// telegram.js

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

// Import your product data helpers
const { getCategories, getProductList } = require('./data/products');

const app = express();
app.use(bodyParser.json());

// Your Telegram Bot Token and webhook URL
const BOT_TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const WEBHOOK_URL = `https://kutabarebot.onrender.com/bot${BOT_TOKEN}`;

const bot = new TelegramBot(BOT_TOKEN, { webHook: true });
bot.setWebHook(WEBHOOK_URL);

const adminId = 7699555744;
const BACKEND_URL = 'https://kutabarebot-backend.onrender.com';

// User states and carts stored in-memory (for demo only, reset on restart)
const userStates = {};
const userCarts = {};
const userOrderData = {};

// Helper to get product price by name and variant
function findProductPrice(name, variant = 'noVariant') {
  const allProducts = getCategories().flatMap(cat => getProductList(cat));
  const product = allProducts.find(p => p.name === name);
  return product ? product.price : 0;
}

// Start command handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;
  userOrderData[chatId] = {};
  
  bot.sendMessage(chatId,
    `Yo! Welcome sa *Kutabare Online Shop*! Pili na sa mga pampasarap, boss!`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '📦 My Orders', callback_data: 'my_orders' }]
        ]
      }
    }
  );
});

// Callback query handler for button presses
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'view_products') {
    // Show categories
    const categoryButtons = getCategories().map(cat => [{ text: cat, callback_data: `cat_${cat}` }]);
    await bot.sendMessage(chatId, 'Pili ka ng category:', {
      reply_markup: {
        inline_keyboard: [...categoryButtons, [{ text: '⬅ Back', callback_data: 'back_main' }]]
      }
    });

  } else if (data.startsWith('cat_')) {
    // Show products in category
    const category = data.replace('cat_', '');
    const products = getProductList(category);

    const productButtons = products.map(p => [{
      text: p.name + (p.variants ? ' ▶' : ''),
      callback_data: p.variants ? `variants_${p.name}` : `add_${p.name}_noVariant`
    }]);

    await bot.sendMessage(chatId, `🧃 *${category}*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [...productButtons, [{ text: '⬅ Back to Categories', callback_data: 'view_products' }]]
      }
    });

  } else if (data.startsWith('variants_')) {
    // Show variants for a product
    const productName = data.replace('variants_', '');
    const allProducts = getCategories().flatMap(cat => getProductList(cat));
    const product = allProducts.find(p => p.name === productName);
    if (!product) return;

    const variantButtons = product.variants.map(v => [{
      text: v,
      callback_data: `add_${product.name}_${v}`
    }]);

    await bot.sendMessage(chatId, `Pili ng variant for *${product.name}*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [...variantButtons, [{ text: '⬅ Back to Categories', callback_data: 'view_products' }]]
      }
    });

  } else if (data.startsWith('add_')) {
    // Add product to cart
    const [_, name, variant] = data.split('_');
    const key = `${name}_${variant}`;
    userCarts[chatId] = userCarts[chatId] || {};
    userCarts[chatId][key] = (userCarts[chatId][key] || 0) + 1;

    await bot.sendMessage(chatId, `✅ Added *${name}* (${variant}) to cart.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '🚚 Proceed to Checkout', callback_data: 'checkout' }]
        ]
      }
    });

  } else if (data === 'checkout') {
    // Checkout flow start - choose delivery method
    const cart = userCarts[chatId];
    if (!cart || Object.keys(cart).length === 0) {
      return bot.sendMessage(chatId, 'Your cart is empty.');
    }

    userStates[chatId] = 'awaiting_delivery_option';
    await bot.sendMessage(chatId, 'Pili ka ng delivery method:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Pickup', callback_data: 'delivery_pickup' }],
          [{ text: 'Same-day Delivery', callback_data: 'delivery_sdd' }]
        ]
      }
    });

  } else if (data.startsWith('delivery_')) {
    // Delivery option selected
    const option = data.replace('delivery_', '');
    userOrderData[chatId] = { ...userOrderData[chatId], delivery: option };
    userStates[chatId] = 'awaiting_contact';

    await bot.sendMessage(chatId, 'Pakibigay ng contact info (Name, Number, Address):');

  } else if (data === 'back_main') {
    // Back to main menu
    await bot.sendMessage(chatId, 'Back to main menu', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '📦 My Orders', callback_data: 'my_orders' }]
        ]
      }
    });
  }

  // Answer callback query to remove loading state
  bot.answerCallbackQuery(query.id);
});

// Handle user messages for states like entering contact info
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = userStates[chatId];
  
  if (state === 'awaiting_contact') {
    const contact = msg.text.trim();
    userOrderData[chatId].contact = contact;

    const cart = userCarts[chatId];
    if (!cart || Object.keys(cart).length === 0) {
      return bot.sendMessage(chatId, 'Your cart is empty. Please add products first.');
    }

    // Build order summary
    const summary = Object.entries(cart).map(([key, qty]) => {
      const [name, variant] = key.split('_');
      const price = findProductPrice(name, variant);
      return `${name} (${variant}) x${qty} - ₱${qty * price}`;
    }).join('\n');

    // Calculate total
    const total = Object.entries(cart).reduce((sum, [key, qty]) => {
      const [name, variant] = key.split('_');
      const price = findProductPrice(name, variant);
      return sum + qty * price;
    }, 0);

    // Prepare order payload for backend
    const order = {
      telegramId: chatId,
      cart,
      contact,
      delivery: userOrderData[chatId].delivery,
      total
    };

    try {
      const orderRes = await axios.post(`${BACKEND_URL}/api/orders`, order);
      const { orderId, qrLink } = orderRes.data;

      await bot.sendMessage(chatId,
        `✅ *Order Summary:*\n\n${summary}\n\n*Total: ₱${total}*\n\n` +
        `Delivery: ${order.delivery}\nContact: ${contact}\n\n` +
        `Scan or tap the link below to pay:\n${qrLink}`, {
        parse_mode: 'Markdown'
      });

      // Notify admin
      await bot.sendMessage(adminId,
        `New order from @${msg.from.username || 'N/A'}\nOrder ID: ${orderId}\nTotal: ₱${total}`);

      // Reset user session
      userCarts[chatId] = {};
      userOrderData[chatId] = {};
      userStates[chatId] = null;

    } catch (error) {
      console.error('Order creation failed:', error);
      bot.sendMessage(chatId, 'Sorry, may problema sa pag-submit ng order. Try ulit later.');
    }
  }
});

// Payment status webhook for backend to notify bot about payment updates
app.post('/payment-webhook', async (req, res) => {
  const { orderId, paymentStatus } = req.body;

  try {
    const orderRes = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`);
    const order = orderRes.data;

    if (!order || !order.telegramId) return res.status(404).send('Order not found');

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
    console.error('Payment webhook error:', err);
    res.status(500).send('Error processing payment webhook');
  }
});

// Start Express server to listen for webhook and other HTTP requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
