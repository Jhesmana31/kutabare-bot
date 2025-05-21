const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';  // replace with your bot token
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// User session store
const userSessions = {};

// Sample product data with categories and variants
const products = {
  'Cock Rings & Toys': [
    { name: 'Cock Ring - Pack of 3', price: 80 },
    { name: 'Cock Ring Vibrator', price: 60 },
    { name: 'Spikey Jelly (Red)', price: 160 },
    { name: 'Spikey Jelly (Black)', price: 160 },
    { name: '"Th Bolitas" Jelly', price: 160 },
    { name: 'Portable Wired Vibrator Egg', price: 130 },
    { name: 'Delay Collar', price: 200 },
    { name: 'Delay Ejaculation Buttplug', price: 200 },
  ],
  'Lubricants & Condoms': [
    { name: 'Monogatari Lube Tube', price: 120 },
    { name: 'Monogatari Lube Pinhole', price: 120 },
    { name: 'Monogatari Flavored Lube', price: 200, variants: ['Peach', 'Strawberry', 'Cherry'] },
    { name: 'Ultra thin 001 Condoms', price: 90, variants: ['Black', 'Long Battle', 'Blue', 'Naked Pleasure', 'Granule Passion'] },
  ],
  'Performance Enhancers': [
    { name: 'Maxman per Tab', price: 40 },
    { name: 'Maxman per Pad', price: 400, discount: 50 },
  ],
  'Spicy Accessories': [
    { name: 'Eucalyptus Menthol Food Grade', price: null, variants: ['15-20 (1k)', '25-30 (1.5k)', '35-40 (2k)'] },
    { name: '8 Inches African Version Dildo', price: 370, variants: ['Black', 'Clear', 'Pink'] },
    { name: 'Masturbator Cup', price: 120, variants: ['Yellow (Mouth)', 'Gray (Arse)', 'Black (Vagina)'] },
    { name: 'Mouth Fresheners', price: 90, variants: ['Peach', 'Mint'] },
  ],
  'Essentials': [
    { name: 'Insulin Syringe', price: 20 },
    { name: 'Sterile Water for Injection', price: 15 },
  ],
};

const PICKUP_LOCATION = "Evangelista St. Pavia";
const ADMIN_CHAT_ID = 7699555744; // replace with your Telegram user ID

// Helper: send categories keyboard
function sendCategories(chatId) {
  const categoryButtons = Object.keys(products).map(cat => [{ text: cat, callback_data: `category_${cat}` }]);
  bot.sendMessage(chatId, 'Pumili ng category:', {
    reply_markup: { inline_keyboard: categoryButtons }
  });
}

// Helper: send products for a category
function sendProducts(chatId, category) {
  const prodButtons = products[category].map(prod => [{ 
    text: prod.name + (prod.price ? ` - Php ${prod.price}` : ''), 
    callback_data: `product_${category}_${prod.name}` 
  }]);
  prodButtons.push([{ text: 'Back to Categories', callback_data: 'back_categories' }]);
  bot.sendMessage(chatId, `Mga produkto sa ${category}:`, {
    reply_markup: { inline_keyboard: prodButtons }
  });
}

// Helper: send variants for a product
function sendVariants(chatId, category, productName) {
  const product = products[category].find(p => p.name === productName);
  if (!product || !product.variants) {
    // No variants, add to cart directly
    addToCart(chatId, productName, product.price, 1);
    askAddMore(chatId);
    return;
  }

  const variantButtons = product.variants.map(v => [{ 
    text: v, 
    callback_data: `variant_${category}_${productName}_${v}` 
  }]);
  variantButtons.push([{ text: 'Back to Products', callback_data: `category_${category}` }]);
  bot.sendMessage(chatId, `Piliin ang variant ng ${productName}:`, {
    reply_markup: { inline_keyboard: variantButtons }
  });
}

// Add item to user's cart
function addToCart(chatId, name, price, quantity, variant) {
  if (!userSessions[chatId]) userSessions[chatId] = { cart: [] };
  let itemName = name;
  if (variant) itemName += ` (${variant})`;

  const session = userSessions[chatId];
  // Check if already in cart, then increase qty
  const existing = session.cart.find(i => i.name === itemName);
  if (existing) {
    existing.quantity += quantity;
  } else {
    session.cart.push({ name: itemName, price, quantity });
  }
}

// Ask if want to add more or proceed to delivery option
function askAddMore(chatId) {
  bot.sendMessage(chatId, 'Add more products or proceed?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Add More', callback_data: 'add_more' },
          { text: 'Checkout', callback_data: 'checkout' }
        ]
      ]
    }
  });
}

// Calculate total cart amount
function calculateTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// Ask delivery option
function askDeliveryOption(chatId) {
  bot.sendMessage(chatId, 'Pili ka, pick up or delivery?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Pick Up', callback_data: 'delivery_pickup' },
          { text: 'Delivery', callback_data: 'delivery_delivery' }
        ]
      ]
    }
  });
}

// Confirm order summary before placing order
function confirmOrder(chatId) {
  const session = userSessions[chatId];
  if (!session || !session.cart || session.cart.length === 0) {
    bot.sendMessage(chatId, 'Walang laman ang cart mo.');
    return;
  }
  const total = calculateTotal(session.cart);
  let msg = `Order mo:\n`;
  session.cart.forEach(i => {
    msg += `- ${i.name} x${i.quantity} = Php ${i.price * i.quantity}\n`;
  });
  msg += `Total: Php ${total}\n\n`;
  msg += `Delivery Option: ${session.deliveryOption}\n`;
  if (session.deliveryOption === 'Delivery') {
    msg += `Address: ${session.address}\n`;
  } else {
    msg += `Pick Up Location: ${PICKUP_LOCATION}\n`;
  }
  msg += `\nConfirm order?`;

  bot.sendMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Confirm', callback_data: 'confirm_order' },
          { text: 'Cancel', callback_data: 'cancel_order' }
        ]
      ]
    }
  });
}

// Place order: send to backend
async function placeOrder(chatId) {
  const session = userSessions[chatId];
  if (!session) return;

  const orderData = {
    telegramId: chatId.toString(),
    name: session.name || '',
    contact: session.contact || '',
    deliveryOption: session.deliveryOption,
    address: session.address || '',
    products: session.cart,
    totalAmount: calculateTotal(session.cart),
    paymentStatus: 'pending',
  };

  try {
    await axios.post('https://kutabare-backend.onrender.com/api/orders', orderData);
    bot.sendMessage(chatId, 'Order received! I will send you the payment QR once ready.');
    // Clear session
    userSessions[chatId] = {};
  } catch (error) {
    bot.sendMessage(chatId, 'Sorry, may problema sa pag-place ng order mo. Try ulit later.');
  }
}

// Handle callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!userSessions[chatId]) userSessions[chatId] = { cart: [] };

  if (data === 'start') {
    userSessions[chatId] = { cart: [] };
    bot.sendMessage(chatId, 'Welcome sa Kutabare Online Shop!');
    return sendCategories(chatId);
  }

  if (data.startsWith('category_')) {
    const category = data.split('_')[1];
    return sendProducts(chatId, category);
  }

  if (data.startsWith('product_')) {
    const [_, category, productName] = data.split('_');
    return sendVariants(chatId, category, productName);
  }

  if (data.startsWith('variant_')) {
    const [_, category, productName, variant] = data.split('_');
    const product = products[category].find(p => p.name === productName);
    let price = product.price;
    if (variant && productName === 'Maxman per Pad') {
      // apply discount example, otherwise just normal price
      price = product.price - (product.discount || 0);
    }
    addToCart(chatId, productName, price, 1, variant);
    return askAddMore(chatId);
  }

  if (data === 'add_more') {
    return sendCategories(chatId);
  }

  if (data === 'checkout') {
    return askDeliveryOption(chatId);
  }

  if (data === 'delivery_pickup') {
  userSessions[chatId].deliveryOption = 'Pick Up';
  userSessions[chatId].address = '';
  return confirmOrder(chatId);
}

if (data === 'delivery_delivery') {
  userSessions[chatId].deliveryOption = 'Delivery';
  bot.sendMessage(chatId, 'Pakisend ng complete address mo:');
  userSessions[chatId].waitingForAddress = true;
  return;
}

if (data === 'confirm_order') {
  await placeOrder(chatId);
  return;
}

if (data === 'cancel_order') {
  userSessions[chatId] = { cart: [] };
  bot.sendMessage(chatId, 'Order cancelled.');
  return sendCategories(chatId);
}

bot.answerCallbackQuery(query.id);
});

// Listen for address if delivery selected
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions[chatId];
  
  if (session?.waitingForAddress) {
    session.address = msg.text;
    session.waitingForAddress = false;
    confirmOrder(chatId);
    return;
  }
});
