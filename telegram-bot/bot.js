const TelegramBot = require('node-telegram-bot-api');
const products = require('./products');
const orderHandler = require('./orderHandler');
const config = require('./config');

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const categories = Object.keys(products);
  const buttons = categories.map(cat => [{ text: cat }]);
  bot.sendMessage(chatId, 'Choose a category:', {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true
    }
  });
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (products[msg.text]) {
    orderHandler.handleCategory(bot, chatId, msg.text);
  } else {
    orderHandler.handleOrderFlow(bot, msg);
  }
});
