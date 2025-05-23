const TelegramBot = require('node-telegram-bot-api');
const { getCategories, getProductList } = require('./data/products');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// In-memory cart per user
const userCarts = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Yo! Welcome sa Kutabare Online Shop! Pili na sa mga pampasarap, boss!', {
    parse_mode: 'Markdown',
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
    const categories = getCategories();
    const categoryButtons = categories.map(cat => ([{
      text: cat,
      callback_data: `cat_${encodeURIComponent(cat)}`
    }]));

    return bot.sendMessage(chatId, 'Anong trip mo today? Pili ka ng category:', {
      reply_markup: { inline_keyboard: categoryButtons }
    });
  }

  else if (data.startsWith('cat_')) {
    const category = decodeURIComponent(data.replace('cat_', ''));
    const products = getProductList(category);

    if (products.length === 0) {
      return bot.sendMessage(chatId, `Walang laman ang category na 'yan bossing. Pili ka muna ng iba.`);
    }

    const keyboard = products.map(p => ([{
      text: `${p.name} - ₱${p.price}`,
      callback_data: `prod_${encodeURIComponent(category)}_${encodeURIComponent(p.name)}`
    }]));
    keyboard.push([{ text: '« Back to Categories', callback_data: 'view_products' }]);

    return bot.sendMessage(chatId, `Ayan na! Pili na kung anong pampasarap ang gusto mo:`, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  else if (data.startsWith('prod_')) {
    const [, categoryEncoded, nameEncoded] = data.split('_');
    const category = decodeURIComponent(categoryEncoded);
    const productName = decodeURIComponent(nameEncoded);
    const products = getProductList(category);
    const product = products.find(p => p.name === productName);

    if (!product) return bot.sendMessage(chatId, 'Product not found.');

    const variantButtons = product.variants
      ? product.variants.map(v => ([{
          text: v,
          callback_data: `cart_${encodeURIComponent(product.name)}_${encodeURIComponent(v)}`
        }]))
      : [[{
          text: 'Add to Cart',
          callback_data: `cart_${encodeURIComponent(product.name)}_noVariant`
        }]];

    variantButtons.push([{ text: '« Back to Categories', callback_data: 'view_products' }]);

    return bot.sendMessage(chatId, `*${product.name}*\n\nPrice: ₱${product.price}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: variantButtons }
    });
  }

  else if (data.startsWith('cart_')) {
    const [, nameEncoded, variantEncoded] = data.split('_');
    const name = decodeURIComponent(nameEncoded);
    const variant = decodeURIComponent(variantEncoded);
    
    // Save to cart
    if (!userCarts[chatId]) userCarts[chatId] = [];
    userCarts[chatId].push({ name, variant });

    const keyboard = [[{ text: '🧾 Place Order', callback_data: `place_order` }]];

    return bot.sendMessage(chatId, `Added *${name}* (${variant !== 'noVariant' ? variant : 'No Variant'}) to cart mo, boss.`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  else if (data === 'place_order') {
    const cart = userCarts[chatId];
    if (!cart || cart.length === 0) {
      return bot.sendMessage(chatId, 'Wala kang item sa cart mo bossing. Pili ka muna.');
    }

    const orderList = cart.map(item =>
      `- ${item.name} (${item.variant !== 'noVariant' ? item.variant : 'No Variant'})`
    ).join('\n');

    // Send to admin
    const adminId = 7699555744;
    bot.sendMessage(adminId, `NEW ORDER ALERT from ${chatId}:\n\n${orderList}`);

    // Confirm to buyer
    bot.sendMessage(chatId, `Ayos! Order confirmed:\n\n${orderList}\n\nHintayin mo lang ang QR or payment link na ipapadala ko once ready ha.`, {
      parse_mode: 'Markdown'
    });

    // Clear cart
    userCarts[chatId] = [];
  }

  else if (data === 'my_orders') {
    return bot.sendMessage(chatId, 'Feature coming soon! For now, wait for payment confirmation after placing your order.');
  }
});

module.exports = bot;
