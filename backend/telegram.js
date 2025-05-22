module.exports = (bot) => {
  // /start command
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

  // Button presses
  bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    if (data === 'start_order') {
      bot.sendMessage(chatId, 'Great! Please tell me what you want to buy. (For now, just type your order)');
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });

  // Message handler
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.startsWith('/')) return;
    bot.sendMessage(chatId, `You said: ${text}\n(Next: implement order logic here)`);
  });
};
