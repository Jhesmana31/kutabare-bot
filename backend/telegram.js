const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// Set webhook
bot.setWebHook(`${process.env.BACKEND_URL}/bot${process.env.BOT_TOKEN}`);

// Basic reply for testing
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to Kutabare Shop! Type or tap to order.');
});

// Example: reply to "hi"
bot.on('message', (msg) => {
  const text = msg.text?.toLowerCase();
  if (text === 'hi' || text === 'hello') {
    bot.sendMessage(msg.chat.id, 'Hi sexy! What are you in the mood for today?');
  }
});

module.exports = bot;
