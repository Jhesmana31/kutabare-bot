require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { categories, products } = require('./data/products');
const cart = require('./utils/cart');

const app = express();
app.use(express.json());

// Initialize bot without polling
const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.setWebHook(`${process.env.BASE_URL}/bot${process.env.BOT_TOKEN}`);

// Simple in-memory orders store (replace with DB in production)
const orders = {};
// Store payment QR file_id per chat (upload QR on your admin dashboard and save here)
let paymentQRFileId = null;

// Encode/decode callback_data with Base64-safe format
function encodeData(type, category = '', product = '', variant = '') {
  return `cb_${type}_${Buffer.from(category).toString('base64')}_${Buffer.from(product).toString('base64')}_${variant ? Buffer.from(variant).toString('base64') : ''}`;
}
function decodeData(data) {
  const [_, type, catEncoded, prodEncoded, variantEncoded] = data.split('_');
  return {
    type,
    category: catEncoded ? Buffer.from(catEncoded, 'base64').toString() : '',
    product: prodEncoded ? Buffer.from(prodEncoded, 'base64').toString() : '',
    variant: variantEncoded ? Buffer.from(variantEncoded, 'base64').toString() : null
  };
}

// Utility: generate buttons for categories
function getCategoryButtons() {
  return categories.map(cat => [{ text: cat, callback_data: encodeData('category', cat) }]);
}

// Utility: generate buttons for products in a category
function getProductButtons(category) {
  const categoryProducts = products[category];
  if (!categoryProducts) return [];
  return Object.keys(categoryProducts).map(p => [{
    text: categoryProducts[p].label || p,
    callback_data: encodeData('product', category, p)
  }]);
}

// Utility: generate variant buttons
function getVariantButtons(category, product) {
  const productData = products[category][product];
  if (typeof productData !== 'object') return [];
  return Object.keys(productData).map(v => [{
    text: `${v} - Php ${productData[v]}`,
    callback_data: encodeData('variant', category, product, v)
  }]);
}

// Start command - show categories
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const buttons = getCategoryButtons();

  bot.sendMessage(chatId, 'Welcome to Kutabare Online Shop! Choose a category:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// Callback query handler
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!data.startsWith('cb_')) return;

  if (data === 'cb_back_main') {
    const buttons = getCategoryButtons();
    return bot.sendMessage(chatId, 'Choose a category:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (data === 'cb_view_cart') {
    return showCart(chatId);
  }

  if (data === 'cb_checkout') {
    return startCheckout(chatId);
  }

  if (data.startsWith('cb_delete_')) {
    // Delete item from cart
    const index = parseInt(data.split('_')[2], 10);
    cart.remove(chatId, index);
    return showCart(chatId);
  }

  const { type, category, product, variant } = decodeData(data);

  if (type === 'category') {
    const buttons = getProductButtons(category);
    buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);
    buttons.push([{ text: 'View Cart', callback_data: 'cb_view_cart' }]);

    return bot.sendMessage(chatId, `Products under *${category}*:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (type === 'product') {
    const productData = products[category][product];

    if (typeof productData === 'object' && !productData.label) {
      // Show variants
      const buttons = getVariantButtons(category, product);
      buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);
      buttons.push([{ text: 'View Cart', callback_data: 'cb_view_cart' }]);

      return bot.sendMessage(chatId, `Variants of *${product}*:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      // No variants, add directly
      cart.add(chatId, { category, product, price: productData.price, label: productData.label });
      return bot.sendMessage(chatId, `✅ Added *${productData.label}* to your cart.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'View Cart', callback_data: 'cb_view_cart' }],
            [{ text: 'Add More', callback_data: 'cb_back_main' }],
            [{ text: 'Check Out', callback_data: 'cb_checkout' }]
          ]
        }
      });
    }
  }

  if (type === 'variant') {
    const price = products[category][product][variant];
    const label = `${product} (${variant})`;
    cart.add(chatId, { category, product, variant, price, label });
    return bot.sendMessage(chatId, `✅ Added *${label}* to your cart.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'View Cart', callback_data: 'cb_view_cart' }],
          [{ text: 'Add More', callback_data: 'cb_back_main' }],
          [{ text: 'Check Out', callback_data: 'cb_checkout' }]
        ]
      }
    });
  }
});

// Show cart function
async function showCart(chatId) {
  const items = cart.get(chatId);

  if (!items.length) {
    return bot.sendMessage(chatId, 'Your cart is empty.', {
      reply_markup: { inline_keyboard: [[{ text: 'Add Products', callback_data: 'cb_back_main' }]] }
    });
  }

  let message = '*Your Cart:*\n';
  let total = 0;

  items.forEach((item, i) => {
    message += `${i + 1}. ${item.label || item.product}${item.variant ? ` (${item.variant})` : ''} - Php ${item.price}\n`;
    total += item.price;
  });

  message += `\n*Total:* Php ${total}`;

  // Build buttons: delete buttons for each item, plus checkout & add more
  const buttons = items.map((item, i) => ([{ text: `Delete ${i + 1}`, callback_data: `cb_delete_${i}` }]));
  buttons.push([{ text: 'Add More', callback_data: 'cb_back_main' }]);
  buttons.push([{ text: 'Check Out', callback_data: 'cb_checkout' }]);

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

// Checkout flow state management
const checkoutStates = {}; // chatId => state object

// Start checkout: ask for delivery method
async function startCheckout(chatId) {
  const items = cart.get(chatId);
  if (!items.length) {
    return bot.sendMessage(chatId, 'Your cart is empty! Add some products first.', {
      reply_markup: { inline_keyboard: [[{ text: 'Add Products', callback_data: 'cb_back_main' }]] }
    });
  }

  checkoutStates[chatId] = { step: 'delivery' };

  await bot.sendMessage(chatId, 'Choose delivery option:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Pick Up', callback_data: 'delivery_pickup' }],
        [{ text: 'Same-day Delivery', callback_data: 'delivery_delivery' }]
      ]
    }
  });
}

// Handle delivery option and next steps
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Ignore if not in checkout flow or unknown data
  if (!checkoutStates[chatId]) return;

  const state = checkoutStates[chatId];

  if (state.step === 'delivery') {
    if (data === 'delivery_pickup' || data === 'delivery_delivery') {
      state.delivery = data === 'delivery_pickup' ? 'Pick Up' : 'Same-day Delivery';
      state.step = 'collect_name';
      return bot.sendMessage(chatId, 'Please enter your full name:');
    }
  }
});

// Listen for messages (to collect user info in checkout)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = checkoutStates[chatId];

  if (!state) return; // not in checkout flow

  if (state.step === 'collect_name') {
    state.name = msg.text.trim();
    state.step = 'collect_phone';
    return bot.sendMessage(chatId, 'Please enter your phone number:');
  }

  if (state.step === 'collect_phone') {
    state.phone = msg.text.trim();

    if (state.delivery === 'Same-day Delivery') {
      state.step = 'collect_address';
      return bot.sendMessage(chatId, 'Please enter your delivery address:');
    } else {
      state.step = 'confirm_order';
      return confirmOrder(chatId);
    }
  }

  if (state.step === 'collect_address') {
    state.address = msg.text.trim();
    state.step = 'confirm_order';
    return confirmOrder(chatId);
  }

  if (state.step === 'awaiting_proof') {
    // Wait for photo upload proof of payment
    if (msg.photo && msg.photo.length) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      state.paymentProof = fileId;
      state.step = 'completed';

      // Save order info to orders store
      orders[chatId] = {
        ...state,
        cart: cart.get(chatId),
        status: 'Payment Received'
      };

      cart.clear(chatId);

      await bot.sendMessage(chatId, '✅ Proof of payment received! Your order is confirmed and being processed.');
      await bot.sendMessage(process.env.ADMIN_CHAT_ID, `New order from ${state.name}\nPhone: ${state.phone}\nDelivery: ${state.delivery}\nStatus: Payment Received`);

      delete checkoutStates[chatId];
      return;
    } else {
      return bot.sendMessage(chatId, 'Please send a photo as proof of payment.');
    }
  }
});

// Confirm order summary and send payment QR
async function confirmOrder(chatId) {
  const state = checkoutStates[chatId];
  const items = cart.get(chatId);

  let message = '*Order Summary:*\n';
  let total = 0;
  items.forEach((item, i) => {
    message += `${i + 1}. ${item.label || item.product}${item.variant ? ` (${item.variant})` : ''} - Php ${item.price}\n`;
    total += item.price;
  });

  message += `\n*Total:* Php ${total}\n\n`;
  message += `*Name:* ${state.name}\n*Phone:* ${state.phone}\n*Delivery:* ${state.delivery}`;
  if (state.address) message += `\n*Address:* ${state.address}`;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  if (!paymentQRFileId) {
    await bot.sendMessage(chatId, 'Sorry, payment QR is not available yet. Please wait for admin to upload it.');
    return;
  }

  await bot.sendPhoto(chatId, paymentQRFileId, {
    caption: 'Please scan this QR code to pay your order. After payment, upload your proof of payment as a photo here.'
  });

  state.step = 'awaiting_proof';

  await bot.sendMessage(chatId, 'Upload your proof of payment as a photo here.');
}

// Webhook to receive Telegram updates
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Endpoint for admin to upload payment QR file_id (POST with JSON { file_id: '' })
app.post('/upload-qr', (req, res) => {
  const { file_id } = req.body;
  if (!file_id) return res.status(400).send({
