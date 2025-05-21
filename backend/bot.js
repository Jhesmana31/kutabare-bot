const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const sessions = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { cart: [] };
  bot.sendMessage(chatId, 'Welcome! Ready to order?');
});

bot.onText(/\/order/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = {
    cart: [
      { name: 'Cock Ring', price: 80 },
      { name: 'Monogatari Lube Tube', price: 120 },
    ],
    deliveryOption: 'Pickup',
    contact: '09123456789',
    telegramId: chatId,
  };

  axios.post('https://your-backend-url/api/orders', sessions[chatId])
    .then(() => bot.sendMessage(chatId, 'Order placed!'))
    .catch(err => {
      console.error(err.response?.data || err.message);
      bot.sendMessage(chatId, 'Error placing order.');
    });
});

module.exports = bot;
