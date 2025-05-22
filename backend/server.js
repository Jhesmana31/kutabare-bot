const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace this with your real backend URL (must be accessible from internet)
const BACKEND_URL = 'https://kutabare-backend.onrender.com';

// Use your new Telegram Bot Token here (hardcoded for testing)
const BOT_TOKEN = '7368568730:AAFNG-62JiBCNdh30XsBTJ-TPCtQaSO5pX4';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup Telegram bot with webhook
const bot = new TelegramBot(BOT_TOKEN, { webHook: true });

// Set Telegram webhook
bot.setWebHook(`${BACKEND_URL}/bot${BOT_TOKEN}`).then(() => {
  console.log('Webhook set successfully');
}).catch(err => {
  console.error('Error setting webhook:', err.response?.data || err.message);
});

// Webhook route - Telegram will POST updates here
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Simple test route
app.get('/', (req, res) => res.send('Kutabare backend live!'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Optional: Example bot handlers
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome! Send me any message to test.');
});

bot.on('message', (msg) => {
  if (!msg.text.startsWith('/')) {
    bot.sendMessage(msg.chat.id, `You said: ${msg.text}`);
  }
});
