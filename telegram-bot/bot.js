require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const token = process.env.BOT_TOKEN;

// Initialize bot in webhook mode (important for Render)
const bot = new TelegramBot(token, {
  webHook: { port: PORT },
});

// Middleware
app.use(bodyParser.json());

// Health check endpoint (Render pings this)
app.get('/', (req, res) => {
  res.send('Kutabare Bot is alive!');
});

// Set webhook to your public Render domain
bot.setWebHook(`${process.env.BACKEND_URL}/bot${token}`);

// Endpoint that Telegram sends updates to
app.post(`/bot${token}`, (req, res) => {
  console.log("Update received:", JSON.stringify(req.body, null, 2));
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Basic command: /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hi! Kutabare Bot reporting for duty!");
});

// Listen to all messages for keyword 'order'
bot.on('message', async (msg) => {
  const text = msg.text?.toLowerCase();
  if (text && text.includes("order")) {
    try {
      // Forward order info to your backend
      await axios.post('https://kutabare-backend.onrender.com/api/order', {
        chatId: msg.chat.id,
        message: msg.text,
      });
      bot.sendMessage(msg.chat.id, "Got it! Order is being processed.");
    } catch (err) {
      console.error("Error forwarding to backend:", err.message);
      bot.sendMessage(msg.chat.id, "Oops! Backend issue. Try again later.");
    }
  }
});

// Start server (required even with webhooks)
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
