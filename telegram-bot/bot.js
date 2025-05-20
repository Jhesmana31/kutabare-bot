require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const productData = require('./data/products'); // product list with categories/variants
const userSessions = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { products: [] };

  const categories = [...new Set(productData.map(p => p.category))];
  const buttons = categories.map(cat => [{ text: cat, callback_data: `cat_${cat}` }]);

  bot.sendMessage(chatId, "Welcome to Kutabare Online Shop! Choose a category:", {
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const session = userSessions[chatId] || { products: [] };
  const data = query.data;

  if (data.startsWith("cat_")) {
    const category = data.split("cat_")[1];
    const items = productData.filter(p => p.category === category);

    const buttons = items.map(item => [{
      text: item.name,
      callback_data: item.variants ? `varsel_${item.name}` : `qty_${item.name}`
    }]);
    buttons.push([{ text: "Back to Categories", callback_data: "back_categories" }]);

    bot.editMessageText(`Products under *${category}*`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }

  else if (data === "back_categories") {
    const categories = [...new Set(productData.map(p => p.category))];
    const buttons = categories.map(cat => [{ text: cat, callback_data: `cat_${cat}` }]);
    bot.editMessageText("Choose a category:", {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: buttons }
    });
  }

  else if (data.startsWith("varsel_")) {
    const productName = data.split("varsel_")[1];
    const product = productData.find(p => p.name === productName);
    const buttons = product.variants.map(v => [{
      text: `${v} - ₱${product.price}`,
      callback_data: `qty_${productName}__${v}`
    }]);
    buttons.push([{ text: "Back", callback_data: `cat_${product.category}` }]);

    bot.editMessageText(`Choose a variant for *${productName}*`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }

  else if (data.startsWith("qty_")) {
    const [productName, variant] = data.split("qty_")[1].split("__");
    const product = productData.find(p => p.name === productName);
    const itemLabel = variant ? `${productName} (${variant})` : productName;

    const buttons = [1, 2, 3, 4, 5].map(qty => [{
      text: `${qty}`,
      callback_data: `add_${productName}__${variant || "none"}__${qty}`
    }]);
    buttons.push([{ text: "Back", callback_data: `cat_${product.category}` }]);

    bot.editMessageText(`How many *${itemLabel}*?`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }

  else if (data.startsWith("add_")) {
    const [productName, variant, quantity] = data.split("add_")[1].split("__");
    const product = productData.find(p => p.name === productName);

    session.products.push({
      name: productName + (variant !== "none" ? ` (${variant})` : ""),
      price: product.price,
      quantity: parseInt(quantity)
    });

    userSessions[chatId] = session;

    bot.sendMessage(chatId, `✅ Added ${quantity} x ${productName} to your cart.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Add More", callback_data: "back_categories" }],
          [{ text: "Checkout", callback_data: "checkout" }]
        ]
      }
    });
  }

  else if (data === "checkout") {
    bot.sendMessage(chatId, "Choose delivery option:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Pick Up", callback_data: "delivery_pickup" }],
          [{ text: "Same Day Delivery", callback_data: "delivery_delivery" }]
        ]
      }
    });
  }

  else if (data.startsWith("delivery_")) {
    const option = data.split("delivery_")[1];
    session.deliveryOption = option;

    if (option === "delivery") {
      bot.sendMessage(chatId, "Please send your *delivery address*:", { parse_mode: "Markdown" });
      session.awaitingAddress = true;
    } else {
      finalizeOrder(chatId);
    }
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];

  if (session?.awaitingAddress) {
    session.address = msg.text;
    session.awaitingAddress = false;
    finalizeOrder(chatId);
  }
});

async function finalizeOrder(chatId) {
  const session = userSessions[chatId];
  const total = session.products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  const payload = {
    telegramId: chatId,
    products: session.products,
    totalAmount: total,
    deliveryOption: session.deliveryOption,
    address: session.address || '',
    paymentStatus: 'pending'
  };

  try {
    await axios.post('https://kutabare-backend.onrender.com/api/orders', payload);
    bot.sendMessage(chatId, `Order placed! Total: ₱${total}. Payment pending.`);
  } catch (err) {
    console.error(err.message);
    bot.sendMessage(chatId, "Error placing your order. Try again later.");
  }

  delete userSessions[chatId];
}
