const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { getCategories, getProductList } = require('./data/products');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// In-memory cart per user
const userCarts = {};
const userStates = {}; // to track where user is in the order process
const userOrderData = {}; // to temporarily save order data (contact, delivery)

function findProductPrice(name, variant = 'noVariant') {
  const allProducts = getCategories().flatMap(cat => getProductList(cat));
  const product = allProducts.find(p => p.name === name);
  if (!product) return 0;
  return product.price;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;
  userOrderData[chatId] = {};
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

  if (userStates[chatId] === 'awaiting_contact') {
    // Should not reach here because contact is asked via text
    return;
  }
  if (userStates[chatId] === 'awaiting_delivery') {
    // Should not reach here because delivery is chosen via buttons
    return;
  }

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

    // Ask for contact number
    userStates[chatId] = 'awaiting_contact';
    return bot.sendMessage(chatId, 'Ano ang contact number mo, boss? (Please type your phone number)');
  }

  else if (data === 'my_orders') {
    return bot.sendMessage(chatId, 'Feature coming soon! For now, wait for payment confirmation after placing your order.');
  }
});

// Listen to text messages for contact and delivery inputs
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const state = userStates[chatId];

  // Ignore commands or callback queries
  if (msg.text.startsWith('/')) return;

  if (state === 'awaiting_contact') {
    const contact = msg.text.trim();

    // Basic validation (you can improve this)
    if (!/^\d{10,11}$/.test(contact)) {
      return bot.sendMessage(chatId, 'Boss, please enter a valid 10-11 digit phone number.');
    }

    userOrderData[chatId] = { contact };
    userStates[chatId] = 'awaiting_delivery';

    const deliveryOptions = [
      [{ text: 'Pickup', callback_data: 'delivery_pickup' }],
      [{ text: 'Same-day Delivery', callback_data: 'delivery_delivery' }],
      [{ text: 'Cancel Order', callback_data: 'cancel_order' }]
    ];

    return bot.sendMessage(chatId, 'Pili ka ng delivery option boss:', {
      reply_markup: { inline_keyboard: deliveryOptions }
    });
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const state = userStates[chatId];

  if (state === 'awaiting_delivery') {
    if (data === 'delivery_pickup' || data === 'delivery_delivery') {
      const deliveryOption = data === 'delivery_pickup' ? 'Pickup' : 'Same-day Delivery';
      userOrderData[chatId].deliveryOption = deliveryOption;

      const cart = userCarts[chatId];
      if (!cart || cart.length === 0) {
        userStates[chatId] = null;
        userOrderData[chatId] = {};
        return bot.sendMessage(chatId, 'Wala kang item sa cart mo bossing. Pili ka muna.');
      }

      // Calculate order
      const orderList = cart.map(item =>
        `- ${item.name} (${item.variant !== 'noVariant' ? item.variant : 'No Variant'})`
      ).join('\n');

      const itemsForBackend = cart.map(item => {
        const price = findProductPrice(item.name, item.variant);
        return {
          name: item.name,
          variant: item.variant,
          price,
          quantity: 1
        };
      });

      const total = itemsForBackend.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      try {
        await axios.post(`${process.env.BACKEND_URL}/api/orders`, {
          telegramId: chatId,
          items: itemsForBackend,
          contact: userOrderData[chatId].contact,
          total,
          deliveryOption
        });
      } catch (err) {
        console.error('Order save failed:', err.message);
        userStates[chatId] = null;
        userOrderData[chatId] = {};
        return bot.sendMessage(chatId, 'Ayyy. Di ko masave order mo boss. PM mo ako manually please.');
      }

      const adminId = 7699555744;
      bot.sendMessage(adminId, `NEW ORDER ALERT from ${chatId}:\n\n${orderList}\n\nContact: ${userOrderData[chatId].contact}\nDelivery: ${deliveryOption}\nTotal: ₱${total}`);

      bot.sendMessage(chatId, `Ayos! Order confirmed:\n\n${orderList}\n\nDelivery: ${deliveryOption}\nTotal: ₱${total}\n\nHintayin mo lang ang QR or payment link na ipapadala ko once ready ha.`, {
        parse_mode: 'Markdown'
      });

      // Reset states and cart
      userStates[chatId] = null;
      userOrderData[chatId] = {};
      userCarts[chatId] = [];

      return;
    }
    else if (data === 'cancel_order') {
      userStates[chatId] = null;
      userOrderData[chatId] = {};
      return bot.sendMessage(chatId, 'Order cancelled. Kung gusto mo mag-order ulit, i-type lang /start boss!');
    }
  }
});

