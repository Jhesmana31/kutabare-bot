const TelegramBot = require('node-telegram-bot-api');
const { getCategories, getProductList } = require('./data/products'); // Adjust based on your structure

// Initialize the bot WITHOUT polling because you're using webhook
const bot = new TelegramBot(process.env.BOT_TOKEN);

// Your webhook URL must be set somewhere else (e.g., in your server config)
// Example: bot.setWebHook('https://yourdomain.com/bot' + process.env.BOT_TOKEN);

const categories = getCategories();
const products = getProductList();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Welcome to Kutabare Online Shop! Select an option below:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 View Products', callback_data: 'view_products' }],
        [{ text: '📦 My Orders', callback_data: 'my_orders' }]
      ]
    }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'view_products') {
    const categoryButtons = categories.map(category => ({
      text: category.name,
      callback_data: `category_${category.id}`
    }));

    bot.sendMessage(chatId, 'Choose a category:', {
      reply_markup: {
        inline_keyboard: categoryButtons.map(button => [button])
      }
    });
  } else if (data.startsWith('category_')) {
    const categoryId = data.split('_')[1];
    const category = categories.find(cat => cat.id === categoryId);

    const productButtons = products
      .filter(product => product.categoryId === categoryId)
      .map(product => ({
        text: product.name,
        callback_data: `product_${product.id}`
      }));

    bot.sendMessage(chatId, `Products in ${category.name}:`, {
      reply_markup: {
        inline_keyboard: productButtons.map(button => [button])
      }
    });
  } else if (data.startsWith('product_')) {
    const productId = data.split('_')[1];
    const product = products.find(prod => prod.id === productId);

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
    const product = products.find(prod => prod.id === productId);

    bot.sendMessage(chatId, `${product.name} has been added to your cart. You can proceed with your order.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Proceed to Checkout', callback_data: `checkout_${productId}` }],
          [{ text: '↩️ Back to Products', callback_data: 'view_products' }]
        ]
      }
    });
  } else if (data.startsWith('checkout_')) {
    bot.sendMessage(chatId, 'Please provide your contact details for the order.');
    // Continue checkout logic here
  }
});

module.exports = bot;
