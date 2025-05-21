const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { cart: [] };
  bot.sendMessage(chatId, 'Welcome! Type /order to place an order!');
});

bot.onText(/\/order/, (msg) => {
  const chatId = msg.chat.id;
  const order = {
    items: [
      { name: 'Cock Ring', price: 80 },
      { name: 'Monogatari Lube Tube', price: 120 },
    ],
    deliveryOption: 'Pickup',
    contact: '09123456789',
    telegramId: chatId,
    total: 200,
  };

  axios.post(`${process.env.BACKEND_URL}/api/orders`, order)
    .then(res => bot.sendMessage(chatId, `Order placed! ID: ${res.data.orderId}`))
    .catch(err => {
      console.error(err.response?.data || err.message);
      bot.sendMessage(chatId, 'Failed to place order.');
    });
});

module.exports = bot;
