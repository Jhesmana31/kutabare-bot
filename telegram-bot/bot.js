require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const products = require('./products');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Set webhook
bot.setWebHook(`${process.env.BACKEND_URL}/bot${token}`);
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Order flow state
const userState = {};

// Start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = {};
  bot.sendMessage(chatId, 'Hi! I’m Kutabare Bot! Ready to take your spicy order.', {
    reply_markup: {
      inline_keyboard: Object.keys(products).map((cat) => [
        { text: cat, callback_data: `cat:${cat}` },
      ]),
    },
  });
});

// Handle button actions
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('cat:')) {
    const category = data.split(':')[1];
    userState[chatId].category = category;

    const items = products[category];
    const buttons = items.map((item, i) => [
      { text: item.name, callback_data: `prod:${i}` },
    ]);

    bot.editMessageText(`Select a product from *${category}*`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  }

  else if (data.startsWith('prod:')) {
    const index = parseInt(data.split(':')[1]);
    const category = userState[chatId].category;
    const item = products[category][index];
    userState[chatId].product = item;

    if (item.variants) {
      const buttons = item.variants.map((v) => [
        { text: v, callback_data: `var:${v}` },
      ]);
      bot.sendMessage(chatId, `Choose variant for *${item.name}*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });
    } else {
      userState[chatId].variant = null;
      askQuantity(chatId);
    }
  }

  else if (data.startsWith('var:')) {
    userState[chatId].variant = data.split(':')[1];
    askQuantity(chatId);
  }

  else if (data.startsWith('qty:')) {
    userState[chatId].quantity = parseInt(data.split(':')[1]);
    askDelivery(chatId);
  }

  else if (data.startsWith('delivery:')) {
    userState[chatId].deliveryOption = data.split(':')[1];
    if (userState[chatId].deliveryOption === 'delivery') {
      bot.sendMessage(chatId, 'Drop your address please:');
      userState[chatId].expecting = 'address';
    } else {
      userState[chatId].address = 'Pick up';
      askContact(chatId);
    }
  }
});

// Collect address/contact
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const state = userState[chatId];
  if (!state) return;

  if (state.expecting === 'address') {
    state.address = msg.text;
    state.expecting = null;
    askContact(chatId);
  } else if (state.expecting === 'contact') {
    state.contact = msg.text;
    state.expecting = null;
    finalizeOrder(chatId);
  }
});

// Helpers
function askQuantity(chatId) {
  const buttons = [1, 2, 3, 4, 5].map((n) => [
    { text: `${n}`, callback_data: `qty:${n}` },
  ]);
  bot.sendMessage(chatId, 'How many would you like?', {
    reply_markup: { inline_keyboard: buttons },
  });
}

function askDelivery(chatId) {
  const buttons = [
    [{ text: 'Pick up', callback_data: 'delivery:pickup' }],
    [{ text: 'Delivery', callback_data: 'delivery:delivery' }],
  ];
  bot.sendMessage(chatId, 'Delivery option?', {
    reply_markup: { inline_keyboard: buttons },
  });
}

function askContact(chatId) {
  bot.sendMessage(chatId, 'Please enter your contact number:');
  userState[chatId].expecting = 'contact';
}

async function finalizeOrder(chatId) {
  const state = userState[chatId];
  const productName = state.product.name + (state.variant ? ` - ${state.variant}` : '');
  const total = state.product.price * state.quantity;

  const order = {
    telegramId: chatId,
    name: productName,
    contact: state.contact,
    deliveryOption: state.deliveryOption,
    address: state.address,
    products: [{
      name: productName,
      price: state.product.price,
      quantity: state.quantity,
    }],
    totalAmount: total,
  };

  try {
    await axios.post(`${process.env.BACKEND_URL}/api/orders`, order);
    bot.sendMessage(chatId, `Order placed! Total: ₱${total}\nWe’ll contact you soon.`);
    delete userState[chatId];
  } catch (err) {
    console.error("Order error:", err.message);
    bot.sendMessage(chatId, "Oops! Something went wrong while placing your order.");
  }
}

// Express startup
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
