const TelegramBot = require('node-telegram-bot-api');
const { getProductList, getCategories } = require('./data'); // Adjust based on how your data is structured

// Initialize the bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const categories = getCategories(); // Get categories from your data
const products = getProductList(); // List all products (or per category)

// Handle the `/start` command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Welcome message
  bot.sendMessage(chatId, 'Welcome to Kutabare Online Shop! Select an option below:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 View Products', callback_data: 'view_products' }],
        [{ text: '📦 My Orders', callback_data: 'my_orders' }]
      ]
    }
  });
});

// Handle button clicks (callbacks)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'view_products') {
    // Show product categories
    const categoryButtons = categories.map((category) => ({
      text: category.name,
      callback_data: `category_${category.id}`
    }));

    bot.sendMessage(chatId, 'Choose a category:', {
      reply_markup: {
        inline_keyboard: categoryButtons
      }
    });
  } else if (data.startsWith('category_')) {
    // Show products in the selected category
    const categoryId = data.split('_')[1];
    const category = categories.find((cat) => cat.id === categoryId);

    const productButtons = products
      .filter((product) => product.categoryId === categoryId)
      .map((product) => ({
        text: product.name,
        callback_data: `product_${product.id}`
      }));

    bot.sendMessage(chatId, `Products in ${category.name}:`, {
      reply_markup: {
        inline_keyboard: productButtons
      }
    });
  } else if (data.startsWith('product_')) {
    // Show product details
    const productId = data.split('_')[1];
    const product = products.find((prod) => prod.id === productId);

    bot.sendMessage(chatId, `${product.name}\nPrice: Php ${product.price}\n${product.description || ''}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Add to Cart', callback_data: `add_to_cart_${product.id}` }],
          [{ text: '↩️ Back to Categories', callback_data: 'view_products' }]
        ]
      }
    });
  } else if (data.startsWith('add_to_cart_')) {
    const productId = data.split('_')[2];
    const product = products.find((prod) => prod.id === productId);

    bot.sendMessage(chatId, `${product.name} has been added to your cart. You can proceed with your order.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Proceed to Checkout', callback_data: `checkout_${productId}` }],
          [{ text: '↩️ Back to Products', callback_data: 'view_products' }]
        ]
      }
    });
  } else if (data.startsWith('checkout_')) {
    // Trigger checkout process, ask for details (address, delivery option, etc.)
    bot.sendMessage(chatId, 'Please provide your contact details for the order.');
    // Further logic for collecting customer details
  }
});

module.exports = bot;
