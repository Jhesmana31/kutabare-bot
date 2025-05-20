const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { categories } = require('./products/products');
const { generateQrphLink } = require('./utils/qrph');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const userSessions = {};
const adminId = process.env.ADMIN_TELEGRAM_ID;

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: 'category' };

  const categoryButtons = Object.keys(categories).map(cat => [{ text: cat }]);
  bot.sendMessage(chatId, 'Hi beshie! Pili ka ng *category* ng kalandian:', {
    reply_markup: { keyboard: categoryButtons, resize_keyboard: true },
    parse_mode: 'Markdown'
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userSessions[chatId]) return;

  const session = userSessions[chatId];

  // Step 1: Pick category
  if (session.step === 'category' && categories[text]) {
    session.category = text;
    session.step = 'product';

    const products = categories[text].map(p => [{ text: `${p.name} - ₱${p.price}` }]);
    products.push([{ text: '⬅️ Back to Categories' }]);
    bot.sendMessage(chatId, `Pili ka ng *${text}* product:`, {
      reply_markup: { keyboard: products, resize_keyboard: true },
      parse_mode: 'Markdown'
    });
    return;
  }

  // Back to category
  if (text === '⬅️ Back to Categories') {
    session.step = 'category';
    const categoryButtons = Object.keys(categories).map(cat => [{ text: cat }]);
    bot.sendMessage(chatId, 'Balik tayo sa *categories*. Pili ulit:', {
      reply_markup: { keyboard: categoryButtons, resize_keyboard: true },
      parse_mode: 'Markdown'
    });
    return;
  }

  // Step 2: Pick product
  if (session.step === 'product') {
    const product = categories[session.category].find(p => text.startsWith(p.name));
    if (product) {
      session.product = product;
      session.step = 'delivery';

      bot.sendMessage(chatId, 'Anong delivery method mo? Pili below:', {
        reply_markup: {
          keyboard: [['Pick up'], ['Same-day delivery']],
          resize_keyboard: true
        }
      });
    }
    return;
  }

  // Step 3: Delivery method
  if (session.step === 'delivery') {
    session.delivery = text;
    session.step = 'contact';

    bot.sendMessage(chatId, 'Bigay mo contact info mo (Name & Phone):');
    return;
  }

  // Step 4: Contact Info
  if (session.step === 'contact') {
    session.contact = text;
    session.step = 'done';

    const total = session.product.price;
    const orderSummary = `**ORDER SUMMARY**\n\n` +
      `Product: ${session.product.name}\n` +
      `Price: ₱${session.product.price}\n` +
      `Delivery: ${session.delivery}\n` +
      `Contact: ${session.contact}\n\n` +
      `Total: ₱${total}`;

    // Generate QRPH
    const qrphLink = generateQrphLink({
      amount: total,
      refNumber: `ORD-${chatId}-${Date.now()}`
    });

    // Send to user
    bot.sendMessage(chatId, `${orderSummary}\n\nBayad na using QRPH:\n${qrphLink}`, {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });

    // Notify admin
    bot.sendMessage(adminId, `**New Order**\n\n${orderSummary}`, {
      parse_mode: 'Markdown'
    });

    delete userSessions[chatId];
  }
});
