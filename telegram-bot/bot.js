const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

// CONFIG
const TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const app = express();
const url = 'https://kutabare-bot.onrender.com'; // Your live Render domain
const adminId = 7699555744;

// Initialize bot for webhook
const bot = new TelegramBot(TOKEN, { webHook: true });
bot.setWebHook(`${url}/bot${TOKEN}`);

// MIDDLEWARE
app.use(bodyParser.json());
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// SESSION STORAGE
const sessions = {};

const products = {
  "Cock Rings & Toys": [
    { name: "Cock Ring - Pack of 3", price: 80 },
    { name: "Cock Ring Vibrator", price: 60 },
    { name: "Spikey Jelly (Red)", price: 160 },
    { name: "Spikey Jelly (Black)", price: 160 },
    { name: '"Th Bolitas" Jelly', price: 160 },
    { name: "Portable Wired Vibrator Egg", price: 130 },
    { name: "7 Inches African Version Dildo", price: 270 },
    { name: "Masturbator Cup (Yellow - Mouth)", price: 120 },
    { name: "Masturbator Cup (Gray - Arse)", price: 120 },
    { name: "Masturbator Cup (Black - Vagina)", price: 120 }
  ],
  "Lubes & Condoms": [
    { name: "Monogatari Lube Tube", price: 120 },
    { name: "Monogatari Lube Pinhole", price: 120 },
    { name: "Monogatari Flavored Lube - Peach", price: 200 },
    { name: "Monogatari Flavored Lube - Strawberry", price: 200 },
    { name: "Monogatari Flavored Lube - Cherry", price: 200 },
    { name: "Ultra thin 001 Condom - Black", price: 90 },
    { name: "Ultra thin 001 Condom - Long Battle", price: 90 },
    { name: "Ultra thin 001 Condom - Blue", price: 90 },
    { name: "Ultra thin 001 Condom - Naked Pleasure", price: 90 },
    { name: "Ultra thin 001 Condom - Granule Passion", price: 90 }
  ],
  "Performance Enhancers": [
    { name: "Maxman per Tab", price: 40 },
    { name: "Maxman per Pad", price: 400 }
  ],
  "Spicy Accessories": [
    { name: "Delay Collar", price: 200 },
    { name: "Delay Ejaculation Buttplug", price: 200 }
  ],
  "Essentials": [
    { name: "Mouth Freshener - Peach", price: 90 },
    { name: "Mouth Freshener - Mint", price: 90 },
    { name: "Insulin Syringe", price: 20 },
    { name: "Sterile Water for Injection", price: 15 },
    { name: "Eucalyptus Menthol (15-20)", price: 1000 },
    { name: "Eucalyptus Menthol (25-30)", price: 1500 },
    { name: "Eucalyptus Menthol (35-40)", price: 2000 }
  ]
};

// UTIL
function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = { cart: [] };
  }
  return sessions[chatId];
}

// START
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  session.cart = [];

  const categoryButtons = Object.keys(products).map(cat => ([{ text: cat }]));
  bot.sendMessage(chatId, 'Welcome to Kutabare Shop! Choose a category to begin:', {
    reply_markup: { keyboard: categoryButtons, resize_keyboard: true }
  });
});

// CATEGORY SELECTION & ORDER FLOW
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const session = getSession(chatId);

  if (products[text]) {
    session.selectedCategory = text;
    const buttons = products[text].map(p => ([{ text: `${p.name} - ₱${p.price}` }]));
    buttons.push([{ text: 'Back to Categories' }]);
    bot.sendMessage(chatId, `Choose a product from *${text}*:`, {
      parse_mode: 'Markdown',
      reply_markup: { keyboard: buttons, resize_keyboard: true }
    });
    return;
  }

  const allProducts = [].concat(...Object.values(products));
  const selected = allProducts.find(p => text.startsWith(p.name));

  if (text === 'Back to Categories') {
    session.cart = session.cart || [];
    const categoryButtons = Object.keys(products).map(cat => ([{ text: cat }]));
    bot.sendMessage(chatId, 'Back to categories:', {
      reply_markup: { keyboard: categoryButtons, resize_keyboard: true }
    });
    return;
  }

  if (selected) {
    session.selectedProduct = selected;
    session.variant = null; // no variants for now
    bot.sendMessage(chatId, `How many *${selected.name}* would you like to order?`, { parse_mode: 'Markdown' });
    return;
  }

  if (session.selectedProduct) {
    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity <= 0) {
      bot.sendMessage(chatId, 'Please enter a valid number for quantity.');
      return;
    }

    const item = {
      productName: session.selectedProduct.name,
      quantity,
      total: session.selectedProduct.price * quantity
    };
    session.cart.push(item);
    session.selectedProduct = null;

    let cartSummary = 'Current Cart:\n';
    session.cart.forEach((i, idx) => {
      cartSummary += `${idx + 1}. ${i.productName} x${i.quantity} = ₱${i.total}\n`;
    });
    const totalAmount = session.cart.reduce((sum, i) => sum + i.total, 0);
    cartSummary += `\nTotal: ₱${totalAmount}`;

    bot.sendMessage(chatId, cartSummary, {
      reply_markup: {
        keyboard: [
          [{ text: 'Add More Items' }],
          [{ text: 'Proceed to Checkout' }]
        ],
        resize_keyboard: true
      }
    });
    return;
  }

  if (text === 'Add More Items') {
    const categoryButtons = Object.keys(products).map(cat => ([{ text: cat }]));
    bot.sendMessage(chatId, 'Pick another category:', {
      reply_markup: { keyboard: categoryButtons, resize_keyboard: true }
    });
    return;
  }

  if (text === 'Proceed to Checkout') {
    bot.sendMessage(chatId, 'Choose delivery option:', {
      reply_markup: {
        keyboard: [[{ text: 'Pick-up' }], [{ text: 'Same-day Delivery' }]],
        resize_keyboard: true
      }
    });
    return;
  }

  if (text === 'Pick-up' || text === 'Same-day Delivery') {
    session.delivery = text;
    bot.sendMessage(chatId, 'Please enter your full name:');
    session.collecting = 'name';
    return;
  }

  if (session.collecting === 'name') {
    session.name = text;
    bot.sendMessage(chatId, 'Enter your mobile number:');
    session.collecting = 'number';
    return;
  }

  if (session.collecting === 'number') {
    session.number = text;
    bot.sendMessage(chatId, 'Enter delivery address (or type "Pick-up" if none):');
    session.collecting = 'address';
    return;
  }

  if (session.collecting === 'address') {
    session.address = text;
    session.collecting = null;

    const orderTotal = session.cart.reduce((sum, i) => sum + i.total, 0);
    const orderDetails = session.cart.map(i => (
      `${i.productName} x${i.quantity} = ₱${i.total}`
    )).join('\n');

    const summary = `New Order Received:\n\nName: ${session.name}\nMobile: ${session.number}\nAddress: ${session.address}\nDelivery: ${session.delivery}\n\nItems:\n${orderDetails}\n\nTotal: ₱${orderTotal}`;

    // Notify Admin (you) about the new order for manual QR processing
    bot.sendMessage(adminId, summary);

    // Notify Customer order is received and that QR will be sent after manual processing
    bot.sendMessage(chatId, `Thank you for your order! Your total is ₱${orderTotal}.\n\nYou will receive a payment QR code soon once we process your order.`);

    // Clear cart to reset session or you can keep it to allow adding more orders after payment
    session.cart = [];
  }
});

// START SERVER
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
