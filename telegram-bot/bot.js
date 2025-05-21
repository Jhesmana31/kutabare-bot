import express from 'express';
import TelegramBot from 'node-telegram-bot-api';

const TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw'; // Put your bot token here
const WEBHOOK_URL = 'https://kutabare-backend.onrender.com'; // Put your public HTTPS URL here

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${WEBHOOK_URL}/bot${TOKEN}`);

const app = express();
app.use(express.json());

const ADMIN_ID = 7721709933; // Your Telegram user ID for admin notifications

// Product catalog with categories, prices, and variants
const products = {
  "Cock Rings & Toys": [
    { name: "Cock Ring - Pack of 3", price: 80 },
    { name: "Cock Ring Vibrator", price: 60 },
    { name: "Spikey Jelly (Red)", price: 160 },
    { name: "Spikey Jelly (Black)", price: 160 },
    { name: '"Th Bolitas" Jelly', price: 160 },
    { name: "Portable Wired Vibrator Egg", price: 130 },
    { name: "Delay Collar", price: 200 },
    { name: "Delay Ejaculation Buttplug", price: 200 },
    { name: "7 Inches African Version Dildo", price: 270 },
  ],
  "Lubricants & Condoms": [
    { name: "Monogatari Lube Tube", price: 120 },
    { name: "Monogatari Lube Pinhole", price: 120 },
    {
      name: "Monogatari Flavored Lube",
      price: 200,
      variants: ["Peach", "Strawberry", "Cherry"],
    },
    {
      name: "Ultra thin 001 Condoms",
      price: 90,
      variants: ["Black", "Long Battle", "Blue", "Naked Pleasure", "Granule Passion"],
    },
  ],
  "Performance Enhancers": [
    { name: "Maxman per Tab", price: 40 },
    { name: "Maxman per Pad", price: 400 },
  ],
  Essentials: [
    { name: "Insulin Syringe", price: 20 },
    { name: "Sterile Water for Injection", price: 15 },
  ],
  Others: [
    {
      name: "Eucalyptus Menthol Food Grade",
      variants: [
        { name: "15-20", price: 1000 },
        { name: "25-30", price: 1500 },
        { name: "35-40", price: 2000 },
      ],
    },
    {
      name: "Masturbator Cup",
      price: 120,
      variants: ["Yellow (Mouth)", "Gray (Arse)", "Black (Vagina)"],
    },
    {
      name: "Mouth Fresheners",
      price: 90,
      variants: ["Peach", "Mint"],
    },
  ],
};

// In-memory user sessions (reset on server restart)
const sessions = {};

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      state: "START",
      cart: [],
      currentCategory: null,
      currentProduct: null,
      currentVariant: null,
      deliveryOption: null,
      contact: null,
    };
  }
  return sessions[chatId];
}

function getCategoriesKeyboard() {
  const keys = Object.keys(products).map((cat) => [{ text: cat, callback_data: `cat_${cat}` }]);
  return { inline_keyboard: keys };
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (msg.text === '/start' || session.state === 'START' || !session.state) {
    session.state = 'CHOOSING_CATEGORY';
    session.cart = [];
    session.currentCategory = null;
    session.currentProduct = null;
    session.currentVariant = null;
    session.deliveryOption = null;
    session.contact = null;

    await bot.sendMessage(chatId, "Welcome to Kutabare Online Shop! Please choose a category:", {
      reply_markup: getCategoriesKeyboard(),
    });
    return;
  }

  await bot.sendMessage(chatId, "Please use the buttons to navigate the shop.");
});

// Export app for server webhook
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});
