const config = require('./config');

let userSessions = {};

function handleCategory(bot, chatId, category) {
  userSessions[chatId] = { category };
  const items = require('./products')[category];
  const buttons = items.map(item => [{ text: `${item.name} - ₱${item.price}` }]);
  buttons.push([{ text: "Back to Categories" }]);
  bot.sendMessage(chatId, `Choose a product from *${category}*`, {
    parse_mode: 'Markdown',
    reply_markup: { keyboard: buttons, resize_keyboard: true }
  });
}

function handleOrderFlow(bot, msg) {
  const chatId = msg.chat.id;
  const session = userSessions[chatId] || {};

  if (msg.text === "Back to Categories") {
    delete userSessions[chatId];
    const categories = Object.keys(require('./products'));
    const buttons = categories.map(cat => [{ text: cat }]);
    bot.sendMessage(chatId, 'Choose a category:', {
      reply_markup: { keyboard: buttons, resize_keyboard: true }
    });
    return;
  }

  if (!session.category) return;

  const productMatch = msg.text.match(/^(.*?) - ₱(\d+)/);
  if (productMatch) {
    const product = productMatch[1];
    const price = productMatch[2];
    userSessions[chatId].product = product;
    userSessions[chatId].price = price;

    bot.sendMessage(chatId, `Send your contact number & delivery option (e.g. Pick up or Same-day):`);
  } else if (session.product && !session.contactInfo) {
    userSessions[chatId].contactInfo = msg.text;
    const orderSummary = `New Order:\n\nProduct: ${session.product}\nPrice: ₱${session.price}\nCustomer ID: ${chatId}\nContact Info: ${msg.text}`;
    
    bot.sendMessage(config.ADMIN_ID, orderSummary);
    bot.sendMessage(chatId, `Thank you! Your order for *${session.product}* (₱${session.price}) is received. Pay via QR to confirm.`, {
      parse_mode: 'Markdown'
    });

    // QR code would be dynamically generated here when Netbank API is added.
    delete userSessions[chatId];
  }
}

module.exports = { handleCategory, handleOrderFlow };
