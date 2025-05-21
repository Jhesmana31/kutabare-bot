const axios = require('axios');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.BOT_TOKEN;

function sendTelegramMessage(chatId, text) {
  return axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
  });
}

module.exports = { sendTelegramMessage };
