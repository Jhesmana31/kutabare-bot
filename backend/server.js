require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = 'https://kutabare-backend.onrender.com/webhook'; // Your Render backend URL

app.use(bodyParser.json());

// Telegram webhook endpoint
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.message) {
    const chatId = body.message.chat.id;
    const text = body.message.text;

    // Simple reply (you can expand this)
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `Hi! You said: ${text}`,
    });
  }

  res.sendStatus(200);
});

// Set webhook once when server starts
axios.post(`${TELEGRAM_API}/setWebhook`, {
  url: WEBHOOK_URL,
}).then(() => {
  console.log('Webhook set successfully.');
}).catch((err) => {
  console.error('Error setting webhook:', err.response?.data || err.message);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
