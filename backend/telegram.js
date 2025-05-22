const TelegramBot = require('node-telegram-bot-api');
const { getCategories, getProductList } = require('./products');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = '7699555744'; // your Telegram ID

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Yo babe, ready ka na ba? Pili ka muna ng category ng kalandian mo.`, {
    reply_markup: {
      inline_keyboard: buildCategoryKeyboard()
    }
  });
});

// Handle button callbacks
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith('cat_')) {
    const categoryId = data.replace('cat_', '');
    const products = getProductList(categoryId);

    if (products.length === 0) {
      return bot.sendMessage(chatId, `Wala pa tayong pampagana sa category na 'yan. Iba muna babe.`);
    }

    const keyboard = products.map(p => [{
      text: `${p.name} - ₱${p.price}`,
      callback_data: `prod_${encodeURIComponent(p.name)}`
    }]);

    // Add back button
    keyboard.push([{ text: '« Balik sa Categories', callback_data: 'back_categories' }]);

    return bot.sendMessage(chatId, `Ayan na! Pili ka na kung ano gusto mong ipasok sa cart mo.`, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  if (data === 'back_categories') {
    return bot.sendMessage(chatId, `Balik tayo babe. Anong category ang gusto mong landasin?`, {
      reply_markup: {
        inline_keyboard: buildCategoryKeyboard()
      }
    });
  }

  if (data.startsWith('prod_')) {
    const productName = decodeURIComponent(data.replace('prod_', ''));
    return bot.sendMessage(chatId, `Gusto mo ng *${productName}*? Ay grabe ka... mainit-init pa 'yan!\n\nKung ready ka na, i-type mo lang: *"Gora ${productName}"* or sabihin mo lang: *"Sige na!"*`, {
      parse_mode: 'Markdown'
    });
  }
});

// Build category buttons
function buildCategoryKeyboard() {
  const categories = getCategories();
  return categories.map(c => ([{
    text: c.name,
    callback_data: `cat_${c.id}`
  }]));
}

module.exports = bot;
