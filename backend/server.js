require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const { categories, products } = require('./data/products');
const cart = require('./utils/cart');

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define order schema and model
const orderSchema = new mongoose.Schema({
  chatId: Number,
  name: String,
  phone: String,
  delivery: String,
  address: String,
  cart: Array,
  paymentProofFileId: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Store payment QR file_id in DB (only one, updateable)
const qrSchema = new mongoose.Schema({
  fileId: String,
});
const PaymentQR = mongoose.model('PaymentQR', qrSchema);

const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.setWebHook(`${process.env.BASE_URL}/bot${process.env.BOT_TOKEN}`);

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

function getCategoryButtons() {
  return categories.map(cat => [{ text: cat, callback_data: encodeData('category', cat) }]);
}
function getProductButtons(category) {
  const categoryProducts = products[category];
  if (!categoryProducts) return [];
  return Object.keys(categoryProducts).map(p => [{
    text: categoryProducts[p].label || p,
    callback_data: encodeData('product', category, p)
  }]);
}
function getVariantButtons(category, product) {
  const productData = products[category][product];
  if (typeof productData !== 'object') return [];
  return Object.keys(productData).map(v => [{
    text: `${v} - Php ${productData[v]}`,
    callback_data: encodeData('variant', category, product, v)
  }]);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const buttons = getCategoryButtons();

  bot.sendMessage(chatId, 'Welcome to Kutabare Online Shop! Choose a category:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

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
      const buttons = getVariantButtons(category, product);
      buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);
      buttons.push([{ text: 'View Cart', callback_data: 'cb_view_cart' }]);

      return bot.sendMessage(chatId, `Variants of *${product}*:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
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

  const buttons = items.map((item, i) => ([{ text: `Delete ${i + 1}`, callback_data: `cb_delete_${i}` }]));
  buttons.push([{ text: 'Add More', callback_data: 'cb_back_main' }]);
  buttons.push([{ text: 'Check Out', callback_data: 'cb_checkout' }]);

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

const checkoutStates = {};

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

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (checkoutStates[chatId]) {
    const state = checkoutStates[chatId];

    if (state.step === 'delivery') {
      if (data === 'delivery_pickup' || data === 'delivery_delivery') {
        state.delivery = data === 'delivery_pickup' ? 'Pick Up' : 'Same-day Delivery';
        state.step = 'collect_name';
        return bot.sendMessage(chatId, 'Please enter your full name:');
      }
    }
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = checkoutStates[chatId];

  if (!state) return;

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
    if (msg.photo && msg.photo.length) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      state.paymentProof = fileId;
      state.step = 'completed';

      // Save order to DB
      const newOrder = new Order({
        chatId,
        name: state.name,
        phone: state.phone,
        delivery: state.delivery,
        address: state.address,
        cart: cart.get(chatId),
        paymentProofFileId: fileId,
        status: 'Payment Received'
      });

      await newOrder.save();
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

async function confirmOrder(chatId) {
  const state = checkoutStates[chatId];
  const items = cart.get(chatId);

  let summary = `*Order Summary:*\nName: ${state.name}\nPhone: ${state.phone}\nDelivery: ${state.delivery}`;
  if (state.address) {
    summary += `\nAddress: ${state.address}`;
  }
  summary += '\n\n*Items:*\n';

  let total = 0;
  items.forEach((item, i) => {
    summary += `${i + 1}. ${item.label || item.product}${item.variant ? ` (${item.variant})` : ''} - Php ${item.price}\n`;
    total += item.price;
  });
  summary += `\n*Total:* Php ${total}`;

  const qrDoc = await PaymentQR.findOne(); // Get latest QR file ID
  if (qrDoc?.fileId) {
    await bot.sendPhoto(chatId, qrDoc.fileId, {
      caption: summary + '\n\nPlease send a photo of your payment proof:',
      parse_mode: 'Markdown'
    });
  } else {
    await bot.sendMessage(chatId, summary + '\n\n[No QR code uploaded yet]\nPlease send a photo of your payment proof:', {
      parse_mode: 'Markdown'
    });
  }

  state.step = 'awaiting_proof';
}

// Handle QR upload by Admin bot.onText(//upload_qr/, async (msg) => { if (msg.chat.id.toString() !== process.env.ADMIN_CHAT_ID) return; await bot.sendMessage(msg.chat.id, 'Please send the QR code image you want to set as payment QR.'); checkoutStates[msg.chat.id] = { step: 'awaiting_qr_upload' }; });

bot.on('photo', async (msg) => { const chatId = msg.chat.id; const state = checkoutStates[chatId];

if (state && state.step === 'awaiting_qr_upload') { const fileId = msg.photo[msg.photo.length - 1].file_id; await PaymentQR.deleteMany({}); await new PaymentQR({ fileId }).save(); delete checkoutStates[chatId]; return bot.sendMessage(chatId, '✅ New payment QR code uploaded and saved.'); } });

// Express route for webhook app.post(/bot${process.env.BOT_TOKEN}, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

const PORT = process.env.PORT || 3000; app.listen(PORT, () => { console.log(Server running on port ${PORT}); });

