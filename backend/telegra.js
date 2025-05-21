const axios = require('axios');
require('dotenv').config();

const sendTelegramMessage = (chatId, text) => {
  axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
  });
};

module.exports = { sendTelegramMessage };
