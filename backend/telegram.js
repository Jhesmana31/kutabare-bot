const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// Set webhook to your Render backend URL
bot.setWebHook(`${process.env.BACKEND_URL}/bot${process.env.BOT_TOKEN}`);

// Sessions (for example only — for production, store in DB)
const sessions = {};

// Handle /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { cart: [] };
  bot.sendMessage(chatId, 'Welcome! Type /order to place an order!');
});

// Handle /order
bot.onText(/\/order/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = {
    items: [
      { name: 'Cock Ring', price: 80 },
      { name: 'Monogatari Lube Tube', price: 120 },
    ],
    deliveryOption: 'Pickup',
    contact: '09123456789',
    telegramId: chatId,
    status: 'Pending',
  };

  axios.post(`${process.env.BACKEND_URL}/api/orders`, sessions[chatId])
    .then(() => bot.sendMessage(chatId, 'Order placed successfully!'))
    .catch(err => {
      console.error(err.response?.data || err.message);
      bot.sendMessage(chatId, 'Failed to place order.');
    });
});

module.exports = bot;
