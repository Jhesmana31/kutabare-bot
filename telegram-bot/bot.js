require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

// Middleware
app.use(bodyParser.json());

// Set webhook
bot.setWebHook(`${process.env.BACKEND_URL}/bot${token}`);

// Telegram sends updates here
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hi! Kutabare Bot reporting for duty!");
});

// Order message handler
bot.on('message', async (msg) => {
  const text = msg.text?.toLowerCase();
  if (text && text.includes("order")) {
    try {
      await axios.post('https://kutabare-backend.onrender.com/api/order', {
        chatId: msg.chat.id,
        message: msg.text,
      });
      bot.sendMessage(msg.chat.id, "Got it! Order is being processed.");
    } catch (err) {
      console.error(err.message);
      bot.sendMessage(msg.chat.id, "Oops! Backend issue. Try again later.");
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
