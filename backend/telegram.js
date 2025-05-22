const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const productsData = require('./data/products');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const userSessions = {};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { cart: [] };

  const categories = productsData.categories.map(cat => ([
    { text: cat.name, callback_data: `cat_${cat.name}` }
  ]));

  bot.sendMessage(chatId, 'Welcome! Choose a category:', {
    reply_markup: { inline_keyboard: categories }
  });
});

// Handle button presses
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!userSessions[chatId]) userSessions[chatId] = { cart: [] };

  if (data.startsWith('cat_')) {
    const categoryName = data.slice(4);
    const category = productsData.categories.find(c => c.name === categoryName);

    if (!category) return;

    const buttons = category.products.map((product, index) => ([
      { text: product.name, callback_data: `prod_${categoryName}_${index}` }
    ]));
    buttons.push([{ text: 'Back to Categories', callback_data: 'back_to_categories' }]);

    bot.editMessageText(`Category: ${category.name}`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: buttons
      }
    });

  } else if (data === 'back_to_categories') {
    const categories = productsData.categories.map(cat => ([
      { text: cat.name, callback_data: `cat_${cat.name}` }
    ]));

    bot.editMessageText('Choose a category:', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: categories
      }
    });

  } else if (data.startsWith('prod_')) {
    const [, catName, prodIndex] = data.split('_');
    const category = productsData.categories.find(c => c.name === catName);
    const product = category.products[parseInt(prodIndex)];

    userSessions[chatId].selectedProduct = {
      name: product.name,
      price: product.price,
      variants: product.variants || null,
      category: catName,
      index: prodIndex
    };

    if (product.variants) {
      bot.editMessageText(`Choose a variant for *${product.name}*`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: product.variants.map((v, i) => [
            { text: v, callback_data: `variant_${i}` }
          ]).concat([[{ text: 'Back', callback_data: `cat_${catName}` }]])
        }
      });
    } else {
      sendQuantityPicker(bot, chatId, query.message.message_id, product.name, product.price, null, catName);
    }

  } else if (data.startsWith('variant_')) {
    const variantIndex = parseInt(data.split('_')[1]);
    const session = userSessions[chatId];
    const variant = session.selectedProduct.variants[variantIndex];
    session.selectedProduct.variant = variant;

    sendQuantityPicker(
      bot,
      chatId,
      query.message.message_id,
      session.selectedProduct.name,
      session.selectedProduct.price,
      variant,
      session.selectedProduct.category
    );

  } else if (data.startsWith('add_')) {
    const qty = parseInt(data.split('_')[1]);
    const session = userSessions[chatId];
    const { name, price, variant } = session.selectedProduct;

    session.cart.push({
      name,
      price,
      variant: variant || null,
      quantity: qty
    });

    bot.editMessageText(`Added to cart: ${name}${variant ? ` (${variant})` : ''} x${qty}`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Back to Categories', callback_data: 'back_to_categories' }],
          [{ text: 'View Cart / Checkout', callback_data: 'view_cart' }]
        ]
      }
    });

  } else if (data === 'view_cart') {
    const cart = userSessions[chatId].cart;
    if (!cart.length) return bot.sendMessage(chatId, 'Your cart is empty.');

    const summary = cart.map(item => `${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} = ₱${item.quantity * item.price}`).join('\n');
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    bot.sendMessage(chatId, `Your cart:\n${summary}\n\nTotal: ₱${total}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Proceed to Checkout', callback_data: 'checkout' }]
        ]
      }
    });

  } else if (data === 'checkout') {
    bot.sendMessage(chatId, 'Delivery or Pick-up?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Delivery', callback_data: 'method_delivery' }],
          [{ text: 'Pick-up', callback_data: 'method_pickup' }]
        ]
      }
    });

  } else if (data === 'method_delivery') {
    userSessions[chatId].deliveryMethod = 'Delivery';
    bot.sendMessage(chatId, 'Please enter your delivery address:', { parse_mode: 'Markdown' });

  } else if (data === 'method_pickup') {
    userSessions[chatId].deliveryMethod = 'Pick-up';
    const pickupLocation = 'QGGR+46W, Evangelista St, Pavia, 5001 Iloilo\nView on Google Maps';
    finishOrder(chatId, pickupLocation);
  }
});

// Listen for plain text messages (to get delivery address)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];
  if (!session) return;

  if (session.deliveryMethod === 'Delivery' && !session.address) {
    session.address = msg.text;
    finishOrder(chatId, session.address);
  }
});

function sendQuantityPicker(bot, chatId, messageId, name, price, variant, catName) {
  const buttons = [1, 2, 3, 4, 5].map(qty => ([
    { text: `Qty: ${qty}`, callback_data: `add_${qty}` }
  ]));
  buttons.push([{ text: 'Back', callback_data: `cat_${catName}` }]);

  bot.editMessageText(`How many *${name}${variant ? ` (${variant})` : ''}* would you like?`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: buttons
    }
  });
}

async function finishOrder(chatId, address) {
  const session = userSessions[chatId];
  const cart = session.cart;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const summary = cart.map(item => `${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} = ₱${item.quantity * item.price}`).join('\n');
  const orderText = `New Order:\n\n${summary}\n\nTotal: ₱${total}\nDelivery Method: ${session.deliveryMethod}\nAddress: ${address}`;

  bot.sendMessage(chatId, 'Thank you! Your order has been placed.');
  bot.sendMessage(process.env.ADMIN_TG_ID, orderText);

  // Send order to React dashboard backend API
  try {
    await axios.post(`${process.env.REACT_BACKEND_URL}/api/orders`, {
      chatId,
      cart,
      total,
      deliveryMethod: session.deliveryMethod,
      address
    });
  } catch (err) {
    console.error('Error sending order to dashboard:', err.message);
  }

  console.log('Order saved to dashboard:', { chatId, cart, total, deliveryMethod: session.deliveryMethod, address });
  delete userSessions[chatId];
}

module.exports = bot;
