const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');

// CONFIG
const TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const bot = new TelegramBot(TOKEN, { webHook: { port: 3000 } });
const app = express();
const url = 'https://kutabarebot.onrender.com'; // Render domain
const adminId = '7699555744';

bot.setWebHook(`${url}/bot${TOKEN}`);

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
    { name: "Spikey Jelly", price: 160, variants: ["Red", "Black"] },
    { name: '"Th Bolitas" Jelly', price: 160 }
  ],
  "Lubes & Condoms": [
    { name: "Monogatari Lube Tube", price: 120 },
    { name: "Monogatari Lube Pinhole", price: 120 },
    { name: "Monogatari Flavored Lube", price: 200, variants: ["Peach", "Strawberry", "Cherry"] },
    { name: "Ultra thin 001 Condoms", price: 90, variants: ["Black", "Long Battle", "Blue", "Naked Pleasure", "Granule Passion"] }
  ],
  "Performance Enhancers": [
    { name: "Maxman per Tab", price: 40 },
    { name: "Maxman per Pad", price: 400 }
  ],
  "Spicy Accessories": [
    { name: "Portable Wired Vibrator Egg", price: 130 },
    { name: "Delay Collar", price: 200 },
    { name: "Delay Ejaculation Buttplug", price: 200 },
    { name: "7 Inches African Version Dildo", price: 270 },
    { name: "Masturbator Cup", price: 120, variants: ["Yellow (Mouth)", "Gray (Arse)", "Black (Vagina)"] }
  ],
  "Essentials": [
    { name: "Mouth Fresheners", price: 90, variants: ["Peach", "Mint"] },
    { name: "Insulin Syringe", price: 20 },
    { name: "Sterile Water for Injection", price: 15 }
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

// CATEGORY SELECTION
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const session = getSession(chatId);

  if (products[text]) {
    session.selectedCategory = text;
    const buttons = products[text].map(p => ([{ text: p.name }]));
    buttons.push([{ text: 'Back to Categories' }]);
    bot.sendMessage(chatId, `Choose a product from *${text}*:`, {
      parse_mode: 'Markdown',
      reply_markup: { keyboard: buttons, resize_keyboard: true }
    });
    return;
  }

  const allProducts = [].concat(...Object.values(products));
  const selected = allProducts.find(p => p.name === text);

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
    if (selected.variants) {
      const variantButtons = selected.variants.map(v => ([{ text: v }]));
      bot.sendMessage(chatId, 'Choose a variant:', {
        reply_markup: { keyboard: variantButtons, resize_keyboard: true }
      });
    } else {
      session.variant = null;
      bot.sendMessage(chatId, 'Enter quantity:');
    }
    return;
  }

  if (session.selectedProduct && session.selectedProduct.variants && session.selectedProduct.variants.includes(text)) {
    session.variant = text;
    bot.sendMessage(chatId, 'Enter quantity:');
    return;
  }

  if (session.selectedProduct) {
    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity <= 0) {
      bot.sendMessage(chatId, 'Invalid quantity. Please enter a number.');
      return;
    }

    const item = {
      productName: session.selectedProduct.name,
      variantName: session.variant || null,
      quantity,
      total: session.selectedProduct.price * quantity
    };
    session.cart.push(item);
    session.selectedProduct = null;
    session.variant = null;

    let cartSummary = 'Current Cart:\n';
    session.cart.forEach((i, idx) => {
      cartSummary += `${idx + 1}. ${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity} = ₱${i.total}\n`;
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
    bot.sendMessage(chatId, 'Delivery Option?\n\nPick-up or Same-day Delivery?', {
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
    bot.sendMessage(chatId, 'Enter delivery address (or type "Pick-up" again if none):');
    session.collecting = 'address';
    return;
  }

  if (session.collecting === 'address') {
    session.address = text;
    session.collecting = null;

    const orderTotal = session.cart.reduce((sum, i) => sum + i.total, 0);
    const orderDetails = session.cart.map(i => (
      `${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity} = ₱${i.total}`
    )).join('\n');

    const summary = `New Order Received:\n\nName: ${session.name}\nMobile: ${session.number}\nAddress: ${session.address}\nDelivery: ${session.delivery}\n\nItems:\n${orderDetails}\n\nTotal: ₱${orderTotal}`;

    // Send to Admin
    bot.sendMessage(adminId, summary);

    // Show Payment Link to User
    const payLink = `https://api.netbank.com/qrph/generate?amount=${orderTotal}&ref=${chatId}-${Date.now()}`;
    bot.sendMessage(chatId, `Thank you! To complete your order, please pay via QRPH:\n\nTotal: ₱${orderTotal}\n\n[Click to Pay](${payLink})`, {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });

    bot.sendMessage(chatId, 'You will receive a confirmation message after payment is verified.');
  }
});

// LISTEN
app.listen(3000, () => {
  console.log('Bot server running on port 3000');
});
