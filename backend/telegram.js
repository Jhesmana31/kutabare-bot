const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const { getCategories, getProductList } = require('./data/products');

const app = express();
app.use(bodyParser.json());

// --- BOT INITIALISATION (webhook mode) ---
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true, webHook: { port: process.env.PORT || 3000, host: '0.0.0.0' } });

// Replace with your backend URL that saves orders and handles payment status updates
const BACKEND_URL = process.env.BACKEND_URL;

const adminId = 7699555744;

// In-memory state
const userCarts = {};
const userStates = {};     // track where user is in the order process
const userOrderData = {};  // temporarily stores contact + delivery

// --- Helpers ---
function findProductPrice(name, variant = 'noVariant') {
  const allProducts = getCategories().flatMap(cat => getProductList(cat));
  const product = allProducts.find(p => p.name === name);
  return product ? product.price : 0;
}

// --- /start ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;
  userOrderData[chatId] = {};
  bot.sendMessage(chatId,
    'Yo! Welcome sa Kutabare Online Shop! Pili na sa mga pampasarap, boss!',
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

// --- SINGLE callback_query HANDLER ---
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const state = userStates[chatId];

  if (state === 'awaiting_delivery') {
    if (data === 'delivery_pickup' || data === 'delivery_delivery') {
      const deliveryOption = data === 'delivery_pickup' ? 'Pickup' : 'Same-day Delivery';
      userOrderData[chatId].deliveryOption = deliveryOption;

      const cart = userCarts[chatId] || [];
      if (cart.length === 0) {
        userStates[chatId] = null;
        userOrderData[chatId] = {};
        return bot.sendMessage(chatId, 'Wala kang item sa cart mo bossing. Pili ka muna.');
      }

      // Build order details
      const orderList = cart.map(item =>
        `- ${item.name} (${item.variant !== 'noVariant' ? item.variant : 'No Variant'})`
      ).join('\n');

      const itemsForBackend = cart.map(item => ({
        name: item.name,
        variant: item.variant,
        price: findProductPrice(item.name, item.variant),
        quantity: 1
      }));

      const total = itemsForBackend.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      try {
        const response = await axios.post(`${BACKEND_URL}/api/orders`, {
          telegramId: chatId,
          items: itemsForBackend,
          contact: userOrderData[chatId].contact,
          total,
          deliveryOption
        });
        // Store order ID returned by backend for payment tracking
        userOrderData[chatId].orderId = response.data.orderId;
      } catch (err) {
        console.error('Order save failed:', err.message);
        userStates[chatId] = null;
        userOrderData[chatId] = {};
        return bot.sendMessage(chatId,
          'Ayyy. Di ko masave order mo boss. PM mo ako manually please.');
      }

      // Notify admin & user
      bot.sendMessage(adminId,
        `NEW ORDER ALERT from ${chatId}:\n\n${orderList}\n\n` +
        `Contact: ${userOrderData[chatId].contact}\n` +
        `Delivery: ${deliveryOption}\nTotal: ₱${total}`
      );

      bot.sendMessage(chatId,
        `Ayos! Order confirmed:\n\n${orderList}\n\n` +
        `Delivery: ${deliveryOption}\nTotal: ₱${total}\n\n` +
        `Hintayin mo lang ang QR or payment link na ipapadala ko once ready ha.`,
        { parse_mode: 'Markdown' }
      );

      // Reset cart and states, but keep orderId for payment tracking if needed
      userStates[chatId] = null;
      userCarts[chatId] = [];
      // Keep userOrderData for payment tracking (optional: clear after some time)

      return;
    }

    if (data === 'cancel_order') {
      userStates[chatId] = null;
      userOrderData[chatId] = {};
      return bot.sendMessage(chatId,
        'Order cancelled. Kung gusto mo mag-order ulit, i-type lang /start boss!');
    }

    // Ignore other callbacks if awaiting_delivery
    return;
  }

  // Normal navigation flows...

  if (data === 'view_products') {
    const categories = getCategories();
    const buttons = categories.map(cat => ([{
      text: cat,
      callback_data: `cat_${encodeURIComponent(cat)}`
    }]));
    return bot.sendMessage(chatId,
      'Anong trip mo today? Pili ka ng category:',
      { reply_markup: { inline_keyboard: buttons } }
    );
  }

  if (data.startsWith('cat_')) {
    const category = decodeURIComponent(data.replace('cat_', ''));
    const products = getProductList(category);
    if (products.length === 0) {
      return bot.sendMessage(chatId,
        `Walang laman ang category na 'yan bossing. Pili ka muna ng iba.`);
    }
    const keyboard = products.map(p => ([{
      text: `${p.name} - ₱${p.price}`,
      callback_data: `prod_${encodeURIComponent(category)}_${encodeURIComponent(p.name)}`
    }]));
    keyboard.push([{ text: '« Back to Categories', callback_data: 'view_products' }]);
    return bot.sendMessage(chatId,
      `Ayan na! Pili na kung anong pampasarap ang gusto mo:`,
      { reply_markup: { inline_keyboard: keyboard } }
    );
  }

  if (data.startsWith('prod_')) {
    const [, catEnc, nameEnc] = data.split('_');
    const category = decodeURIComponent(catEnc);
    const productName = decodeURIComponent(nameEnc);
    const product = getProductList(category).find(p => p.name === productName);
    if (!product) return bot.sendMessage(chatId, 'Product not found.');

    const variantButtons = product.variants
      ? product.variants.map(v => ([{
        text: v,
        callback_data: `cart_${encodeURIComponent(product.name)}_${encodeURIComponent(v)}`
      }]))
      : [[{
        text: 'Add to Cart',
        callback_data: `cart_${encodeURIComponent(product.name)}_noVariant`
      }]];

    variantButtons.push([{ text: '« Back to Categories', callback_data: 'view_products' }]);

    return bot.sendMessage(chatId,
      `*${product.name}*\n\nPrice: ₱${product.price}`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: variantButtons } }
    );
  }

  if (data.startsWith('cart_')) {
    const [, nameEnc, varEnc] = data.split('_');
    const name = decodeURIComponent(nameEnc);
    const variant = decodeURIComponent(varEnc);

    if (!userCarts[chatId]) userCarts[chatId] = [];
    userCarts[chatId].push({ name, variant });

    return bot.sendMessage(chatId,
      `Added *${name}* (${variant !== 'noVariant' ? variant : 'No Variant'}) to cart mo, boss.`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🧾 Place Order', callback_data: 'place_order' }]] }
      }
    );
  }

  if (data === 'place_order') {
    const cart = userCarts[chatId];
    if (!cart || cart.length === 0) {
      return bot.sendMessage(chatId,
        'Wala kang item sa cart mo bossing. Pili ka muna.');
    }
    userStates[chatId] = 'awaiting_contact';
    return bot.sendMessage(chatId,
      'Ano ang contact number mo, boss? (Please type your phone number)');
  }

  if (data === 'my_orders') {
    // Here you can integrate to show user's order status
    return bot.sendMessage(chatId,
      'Feature coming soon! For now, wait for payment confirmation after placing your order.');
  }
});

// --- MESSAGE HANDLER (contact input) ---
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Ignore commands
  if (msg.text && msg.text.startsWith('/')) return;

  if (userStates[chatId] === 'awaiting_contact') {
    const contact = msg.text.trim();

    if (!/^\d{10,11}$/.test(contact)) {
      return bot.sendMessage(chatId,
        'Boss, please enter a valid 10-11 digit phone number.');
    }

    userOrderData[chatId] = { contact };
    userStates[chatId] = 'awaiting_delivery';

    return bot.sendMessage(chatId,
      'Pili ka ng delivery option boss:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Pickup', callback_data: 'delivery_pickup' }],
            [{ text: 'Same-day Delivery', callback_data: 'delivery_delivery' }],
            [{ text: 'Cancel Order', callback_data: 'cancel_order' }]
          ]
        }
      }
    );
  }
});

// --- PAYMENT STATUS UPDATE WEBHOOK ---
// Your payment backend should POST here when payment proof is received
app.post('/payment-webhook', async (req, res) => {
  try {
    const { orderId, paymentStatus } = req.body;
    if (!orderId || !paymentStatus) {
      return res.status(400).send('Missing orderId or paymentStatus');
    }

    // Fetch order details from backend to get telegramId and order summary
    const orderRes = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`);
    const order = orderRes.data;

    if (!order || !order.telegramId) {
      return res.status(404).send('Order not found or telegramId missing');
    }

    // Notify customer about payment status update
    let statusText = '';
    if (paymentStatus === 'paid') {
      statusText = `Boss, nareceive ko na yung proof of payment mo for order *#${orderId}*. Salamat! Iprocess ko na agad ang order mo.`;
    } else if (paymentStatus === 'pending') {
      statusText = `Boss, pending pa yung payment mo for order *#${orderId}*. Hintayin lang natin ha.`;
    } else if (paymentStatus === 'failed') {
      statusText = `Boss, sorry pero hindi valid yung payment proof mo for order *#${orderId}*. Pakicheck ulit please.`;
    } else {
      statusText = `Update on order *#${orderId}*: status changed to ${paymentStatus}.`;
    }

    await bot.sendMessage(order.telegramId, statusText, { parse_mode: 'Markdown' });

    // Optionally notify admin
    await bot.sendMessage(adminId,
      `Order #${orderId} payment status updated to *${paymentStatus}* for Telegram user ${order.telegramId}.`
    );

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Payment webhook error:', error.message);
    return res.status(500).send('Internal server error');
  }
});

// Start Express server for webhook handling
app.listen(process.env.PORT || 3000, () => {
  console.log('Express server running, Telegram bot webhook ready');
});

// Export bot for external use if needed
module.exports = bot;
