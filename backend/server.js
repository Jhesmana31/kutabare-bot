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

// Base64-safe callback_data encoder/decoder
function encodeData(type, category, product = '', variant = '') {
  return `cb_${type}_${Buffer.from(category).toString('base64')}_${Buffer.from(product).toString('base64')}_${variant ? Buffer.from(variant).toString('base64') : ''}`;
}

function decodeData(data) {
  const [_, type, catEncoded, prodEncoded, variantEncoded] = data.split('_');
  return {
    type,
    category: Buffer.from(catEncoded, 'base64').toString(),
    product: Buffer.from(prodEncoded, 'base64').toString(),
    variant: variantEncoded ? Buffer.from(variantEncoded, 'base64').toString() : null
  };
}

// Handle Telegram webhook updates
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const buttons = categories.map(cat => [{ text: cat, callback_data: encodeData('category', cat) }]);

  bot.sendMessage(chatId, 'Welcome to Kutabare Online Shop! Choose a category:', {
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});

// Handle callback queries
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!data.startsWith('cb_')) return;

  if (data === 'cb_back_main') {
    const buttons = categories.map(cat => [{ text: cat, callback_data: encodeData('category', cat) }]);
    return bot.sendMessage(chatId, 'Choose a category:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  const { type, category, product, variant } = decodeData(data);

  if (type === 'category') {
    const categoryProducts = products[category];
    if (!categoryProducts) return;

    // If product is an object with variants, list products by keys
    const productNames = Object.keys(categoryProducts);

    const buttons = productNames.map(p => [{
      text: p,
      callback_data: encodeData('product', category, p)
    }]);

    buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);

    bot.sendMessage(chatId, `Products under *${category}*:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (type === 'product') {
    const productData = products[category][product];

    if (typeof productData === 'object') {
      // Show variants
      const buttons = Object.keys(productData).map(v => [{
        text: `${v} - Php ${productData[v]}`,
        callback_data: encodeData('variant', category, product, v)
      }]);

      buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);

      bot.sendMessage(chatId, `Variants of *${product}*:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      // No variants, add directly
      cart.add(chatId, { category, product, price: productData });
      bot.sendMessage(chatId, `✅ Added *${product}* to your cart.`, { parse_mode: 'Markdown' });
    }
  }

  if (type === 'variant') {
    const price = products[category][product][variant];
    cart.add(chatId, { category, product, variant, price });
    bot.sendMessage(chatId, `✅ Added *${product}* (${variant}) to your cart.`, { parse_mode: 'Markdown' });
  }
});

// /cart command
bot.onText(/\/cart/, (msg) => {
  const chatId = msg.chat.id;
  const items = cart.get(chatId);

  if (!items.length) {
    return bot.sendMessage(chatId, 'Your cart is empty.');
  }

  let message = '*Your Cart:*\n';
  let total = 0;
  items.forEach((item, i) => {
    message += `${i + 1}. ${item.product}${item.variant ? ` (${item.variant})` : ''} - Php ${item.price}\n`;
    total += item.price;
  });

  message += `\n*Total:* Php ${total}`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Base route
app.get('/', (req, res) => {
  res.send('Kutabare Bot Server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
