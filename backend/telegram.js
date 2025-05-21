const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// Example: Start command — send welcome and show a button to start order
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `Welcome to Kutabare Online Shop! Ready to order?`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Place Order', callback_data: 'start_order' }]
        ]
      }
    });
});

// Handle button presses
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = msg.chat.id;

  if (data === 'start_order') {
    bot.sendMessage(chatId, 'Great! Please tell me what you want to buy. (For now, just type your order)');
    // Here you can expand to show categories or products with buttons
  }

  // Always answer callback queries to remove loading state on Telegram UI
  bot.answerCallbackQuery(callbackQuery.id);
});

// Basic message handler
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip if message is command or callback (already handled)
  if (text.startsWith('/')) return;

  // Echo order text or process it here
  bot.sendMessage(chatId, `You said: ${text}\n(Next: implement order logic here)`);
});

module.exports = bot;
