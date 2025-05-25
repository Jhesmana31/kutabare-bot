require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { categories, products } = require('./data/products');
const cart = require('./utils/cart');

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.setWebHook(`${process.env.BASE_URL}/bot${process.env.BOT_TOKEN}`);

function encodeData(type, category = '', product = '', variant = '') {
  return `cb_${type}_${Buffer.from(category).toString('base64')}_${Buffer.from(product).toString('base64')}_${variant ? Buffer.from(variant).toString('base64') : ''}`;
}
function decodeData(data) {
  const [_, type, cat, prod, variant] = data.split('_');
  return {
    type,
    category: Buffer.from(cat, 'base64').toString(),
    product: Buffer.from(prod, 'base64').toString(),
    variant: variant ? Buffer.from(variant, 'base64').toString() : null
  };
}

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, msg => {
  sendCategories(msg.chat.id);
});

function sendCategories(chatId) {
  const buttons = categories.map(c => [{ text: c, callback_data: encodeData('category', c) }]);
  bot.sendMessage(chatId, 'Choose a category:', { reply_markup: { inline_keyboard: buttons } });
}

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'cb_back_main') return sendCategories(chatId);
  if (data === 'cb_view_cart') return sendCart(chatId);
  if (data === 'cb_checkout') return bot.sendMessage(chatId, 'Checkout coming soon!');

  if (data.startsWith('cb_delete_')) {
    const index = parseInt(data.split('_')[2], 10);
    cart.remove(chatId, index);
    await bot.answerCallbackQuery(query.id, { text: 'Item removed.' });
    return sendCart(chatId);
  }

  if (!data.startsWith('cb_')) return;

  const { type, category, product, variant } = decodeData(data);

  if (type === 'category') {
    const prods = products[category];
    if (!prods) return;
    const buttons = Object.entries(prods).map(([k, v]) => {
      const label = v.label || k;
      if (typeof v === 'object' && !v.price) {
        // has variants
        return [{ text: label, callback_data: encodeData('product', category, k) }];
      } else {
        return [{ text: `${label} - Php ${v.price}`, callback_data: encodeData('product', category, k) }];
      }
    });
    buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);
    return bot.sendMessage(chatId, `Products in *${category}*:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (type === 'product') {
    const prodData = products[category][product];
    if (typeof prodData === 'object' && !prodData.price) {
      // variants exist
      const buttons = Object.entries(prodData).map(([vKey, price]) => [{
        text: `${vKey} - Php ${price}`,
        callback_data: encodeData('variant', category, product, vKey)
      }]);
      buttons.push([{ text: 'Back to Categories', callback_data: 'cb_back_main' }]);
      return bot.sendMessage(chatId, `Variants for *${prodData.label || product}*:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } else {
      // no variants, add product
      cart.add(chatId, {
        category,
        product,
        label: prodData.label || product,
        price: prodData.price
      });
      return bot.sendMessage(chatId, `✅ Added *${prodData.label || product}* to cart.`, {
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
    const label = products[category][product].label || product;

    cart.add(chatId, {
      category,
      product,
      variant,
      label,
      price
    });
    return bot.sendMessage(chatId, `✅ Added *${label}* (${variant}) to cart.`, {
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

function sendCart(chatId) {
  const items = cart.get(chatId);
  if (!items.length) {
    return bot.sendMessage(chatId, 'Your cart is empty.', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Back to Categories', callback_data: 'cb_back_main' }]]
      }
    });
  }
  let msg = '*Your Cart:*\n';
  let total = 0;
  items.forEach((i, idx) => {
    msg += `${idx + 1}. ${i.label}${i.variant ? ` (${i.variant})` : ''} - Php ${i.price}\n`;
    total += i.price;
  });
  msg += `\n*Total:* Php ${total}`;

  const buttons = items.map((_, idx) => ([{
    text: `Delete #${idx + 1}`,
    callback_data: `cb_delete_${idx}`
  }]));
  buttons.push([
    { text: 'Back to Categories', callback_data: 'cb_back_main' },
    { text: 'Check Out', callback_data: 'cb_checkout' }
  ]);

  bot.sendMessage(chatId, msg, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

app.get('/', (req, res) => res.send('Kutabare Bot Server running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
