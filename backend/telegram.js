const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

let userSessions = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: 'category' };

  bot.sendMessage(chatId, 'Welcome to Kutabare Online Shop! Pili lang ng category:', {
    reply_markup: {
      keyboard: [['Cock Rings & Toys', 'Lubes & Condoms'], ['Performance Enhancers', 'Spicy Accessories'], ['Essentials']],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];

  if (!session || !session.step) return;

  const text = msg.text;

  if (session.step === 'category') {
    session.category = text;
    session.step = 'product';

    const res = await axios.get(`${process.env.API_URL}/products?category=${encodeURIComponent(text)}`);
    const products = res.data;

    session.products = products;

    const buttons = products.map(p => [p.name]);
    buttons.push(['Back to Categories', 'Done']);

    bot.sendMessage(chatId, `Category: *${text}*\nPili ng product:`, {
      reply_markup: {
        keyboard: buttons,
        resize_keyboard: true
      },
      parse_mode: 'Markdown'
    });
  } else if (session.step === 'product') {
    if (text === 'Back to Categories') {
      session.step = 'category';
      bot.sendMessage(chatId, 'Balik sa categories. Pili ulit:', {
        reply_markup: {
          keyboard: [['Cock Rings & Toys', 'Lubes & Condoms'], ['Performance Enhancers', 'Spicy Accessories'], ['Essentials']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      return;
    }

    if (text === 'Done') {
      if (!session.order || session.order.length === 0) {
        return bot.sendMessage(chatId, 'Wala kang napili. Pili muna ng item.');
      }
      session.step = 'delivery';
      return bot.sendMessage(chatId, 'Delivery method? Pili ka:', {
        reply_markup: {
          keyboard: [['Pick up', 'Same-day delivery']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    const selected = session.products.find(p => p.name === text);
    if (!selected) return;

    if (!session.order) session.order = [];
    session.order.push(selected);

    bot.sendMessage(chatId, `${selected.name} added! Choose more or tap *Done* when finished.`, { parse_mode: 'Markdown' });
  } else if (session.step === 'delivery') {
    session.delivery = text;
    session.step = 'contact';
    bot.sendMessage(chatId, 'Pakibigay ng contact info (Name + Address + Contact number):');
  } else if (session.step === 'contact') {
    session.contact = text;
    session.step = 'finalizing';

    const summary = session.order.map(item => `• ${item.name} - ₱${item.price}`).join('\n');
    const total = session.order.reduce((sum, item) => sum + item.price, 0);
    const contact = session.contact;

    const order = {
      telegramId: chatId,
      category: session.category,
      items: session.order.map(p => ({ name: p.name, price: p.price })),
      total,
      delivery: session.delivery,
      contact
    };

    try {
      const orderRes = await axios.post(`${process.env.API_URL}/orders`, order);

      await bot.sendMessage(chatId,
        `✅ *Order Summary:*\n\n${summary}\n\n*Total: ₱${total}*\n\n` +
        `Delivery: ${order.delivery}\nContact: ${contact}\n\n` +
        `Wait lang boss, isesend ko ang payment QR saglit lang ha!`, {
        parse_mode: 'Markdown'
      });

      // Notify admin
      await bot.sendMessage(process.env.ADMIN_ID,
        `📥 *New Order!*\n\nFrom: ${chatId}\n\n${summary}\n\nTotal: ₱${total}\nDelivery: ${order.delivery}\nContact: ${contact}`, {
        parse_mode: 'Markdown'
      });

      session.step = null;
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, 'Oops! Something went wrong habang nagsesend ng order.');
    }
  }
});
