const { Telegraf } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const { getCategories, getProductList } = require('./data/products');

const BOT_TOKEN = process.env.BOT_TOKEN || '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const BACKEND_URL = process.env.BACKEND_URL || 'https://kutabarebot-backend.onrender.com';
const WEBHOOK_URL = (process.env.BACKEND_URL || 'https://kutabarebot.onrender.com') + `/bot${BOT_TOKEN}`;

const adminId = 7699555744;

const bot = new Telegraf(BOT_TOKEN);

const app = express();
app.use(bodyParser.json());

// Set webhook at start
(async () => {
  try {
    await bot.telegram.setWebhook(WEBHOOK_URL);
    console.log('Webhook set to:', WEBHOOK_URL);
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
})();

// Express route to receive webhook updates
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// In-memory user data (demo only)
const userStates = {};
const userCarts = {};
const userOrderData = {};

function findProductPrice(name, variant = 'noVariant') {
  const allProducts = getCategories().flatMap(cat => getProductList(cat));
  const product = allProducts.find(p => p.name === name);
  return product ? product.price : 0;
}

// /start command handler
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  userStates[chatId] = null;
  userOrderData[chatId] = {};

  ctx.replyWithMarkdown(
    `Yo! Welcome sa *Kutabare Online Shop*! Pili na sa mga pampasarap, boss!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 View Products', callback_data: 'view_products' }],
          [{ text: '📦 My Orders', callback_data: 'my_orders' }]
        ]
      }
    }
  );
});

// Handle callback queries
bot.on('callback_query', async (ctx) => {
  const chatId = ctx.chat.id;
  const data = ctx.callbackQuery.data;

  if (data === 'view_products') {
    const categoryButtons = getCategories().map(cat => [{ text: cat, callback_data: `cat_${cat}` }]);
    await ctx.reply('Pili ka ng category:', {
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

    await ctx.replyWithMarkdown(`🧃 *${category}*`, {
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

    await ctx.replyWithMarkdown(`Pili ng variant for *${product.name}*`, {
      reply_markup: {
        inline_keyboard: [...variantButtons, [{ text: '⬅ Back to Categories', callback_data: 'view_products' }]]
      }
    });

  } else if (data.startsWith('add_')) {
    const [_, name, variant] = data.split('_');
    const key = `${name}_${variant}`;
    userCarts[chatId] = userCarts[chatId] || {};
    userCarts[chatId][key] = (userCarts[chatId][key] || 0) + 1;

    await ctx.replyWithMarkdown(`✅ Added *${name}* (${variant}) to cart.`, {
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
      return ctx.reply('Your cart is empty.');
    }

    userStates[chatId] = 'awaiting_delivery_option';
    await ctx.reply('Pili ka ng delivery method:', {
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

    await ctx.reply('Pakibigay ng contact info (Name, Number, Address):');

  } else if (data === 'back_main') {
    await ctx.reply('Back to main menu', {
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

// Handle user messages (for contact info)
bot.on('message', async (ctx) => {
  const chatId = ctx.chat.id;
  const state = userStates[chatId];

  if (state === 'awaiting_contact') {
    const contact = ctx.message.text.trim();
    userOrderData[chatId].contact = contact;

    const cart = userCarts[chatId];
    if (!cart || Object.keys(cart).length === 0) {
      return ctx.reply('Your cart is empty. Please add products first.');
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
      // Send order notification only - no payment link yet
      await axios.post(`${BACKEND_URL}/api/orders`, order);

      await ctx.replyWithMarkdown(
        `✅ Order received! Salamat sa Kutabare Online Shop! ` +
        `Hintayin mo lang yung QR code for payment, boss!`
      );

      // Notify admin
      await bot.telegram.sendMessage(adminId,
        `New order from @${ctx.from.username || 'N/A'}\n` +
        `Total: ₱${total}\nContact: ${contact}\nDelivery: ${order.delivery}`);

      // Reset user session
      userCarts[chatId] = {};
      userOrderData[chatId] = {};
      userStates[chatId] = null;

    } catch (error) {
      console.error('Order creation failed:', error);
      ctx.reply('Sorry, may problema sa pag-submit ng order. Try ulit later.');
    }
  }
});

// Payment webhook route to receive payment status updates from backend
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

    await bot.telegram.sendMessage(chatId, statusMsg);

    res.status(200).send('Notification sent');
  } catch (err) {
    console.error('Payment webhook error:', err);
    res.status(500).send('Error processing payment webhook');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
