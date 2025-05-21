const TelegramBot = require('node-telegram-bot-api');

// Replace with your bot token
const token = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

// Product data with variants and prices
const products = {
  "Cock Rings & Toys": [
    { name: "Cock Ring - Pack of 3", price: 80 },
    { name: "Cock Ring Vibrator", price: 60 },
    { name: "Spikey Jelly (Red)", price: 160 },
    { name: "Spikey Jelly (Black)", price: 160 },
    { name: `"Th Bolitas" Jelly`, price: 160 },
    { name: "Portable Wired Vibrator Egg", price: 130 },
    { name: "Delay Collar", price: 200 },
    { name: "Delay Ejaculation Buttplug", price: 200 },
    { name: "8 Inches African Version Dildo", variants: [
        { name: "Black", price: 370 },
        { name: "Clear", price: 370 },
        { name: "Pink", price: 370 },
      ]
    },
  ],
  "Lubricants": [
    { name: "Monogatari Lube Tube", price: 120 },
    { name: "Monogatari Lube Pinhole", price: 120 },
    { name: "Monogatari Flavored Lube", variants: [
        { name: "Peach", price: 200 },
        { name: "Strawberry", price: 200 },
        { name: "Cherry", price: 200 },
      ]
    },
  ],
  "Performance Enhancers": [
    { name: "Maxman per Tab", price: 40 },
    { name: "Maxman per Pad", price: 400, discount: 50 },
  ],
  "Condoms": [
    { name: "Ultra thin 001 for men natural latex condom", variants: [
        { name: "Black", price: 90 },
        { name: "Long Battle", price: 90 },
        { name: "Blue", price: 90 },
        { name: "Naked Pleasure", price: 90 },
        { name: "Granule Passion", price: 90 },
      ]
    },
  ],
  "Menthol & Fresheners": [
    { name: "Eucalyptus Menthol Food Grade", variants: [
        { name: "15-20", price: 1000 },
        { name: "25-30", price: 1500 },
        { name: "35-40", price: 2000 },
      ]
    },
    { name: "Mouth Fresheners", variants: [
        { name: "Peach", price: 90 },
        { name: "Mint", price: 90 },
      ]
    },
  ],
  "Accessories": [
    { name: "Masturbator Cup", variants: [
        { name: "Yellow (Mouth)", price: 120 },
        { name: "Gray (Arse)", price: 120 },
        { name: "Black (Vagina)", price: 120 },
      ]
    },
    { name: "Insulin Syringe", price: 20 },
    { name: "Sterile Water for Injection", price: 15 },
  ],
};

// In-memory carts: chatId => [ {category, product, variant, price, quantity} ]
const carts = {};

// --- Helper to send categories ---
function sendCategories(chatId) {
  const categoryButtons = Object.keys(products).map(cat => ([{
    text: cat,
    callback_data: `category|${cat}`
  }]));
  bot.sendMessage(chatId, "Please choose a product category:", {
    reply_markup: { inline_keyboard: categoryButtons }
  });
}

// --- Helper to send products in category ---
function sendProducts(chatId, category) {
  const prods = products[category];
  if (!prods) return bot.sendMessage(chatId, "Category not found.");

  const productButtons = prods.map(p => ([{
    text: p.name,
    callback_data: `product|${category}|${p.name}`
  }]));

  // Back button
  productButtons.push([{ text: "⬅️ Back to Categories", callback_data: 'backToCategories' }]);

  bot.sendMessage(chatId, `Products in *${category}*:`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: productButtons }
  });
}

// --- Helper to send variants if any ---
function sendVariants(chatId, category, productName) {
  const prods = products[category];
  if (!prods) return bot.sendMessage(chatId, "Category not found.");

  const product = prods.find(p => p.name === productName);
  if (!product) return bot.sendMessage(chatId, "Product not found.");

  if (!product.variants) {
    // No variants - add directly to cart
    addToCart(chatId, category, product.name, null, product.price);
    return;
  }

  const variantButtons = product.variants.map(variant => ([{
    text: `${variant.name} - ₱${variant.price}`,
    callback_data: `variant|${category}|${productName}|${variant.name}|${variant.price}`
  }]));

  // Back to products button
  variantButtons.push([{ text: "⬅️ Back to Products", callback_data: `back|${category}` }]);

  bot.sendMessage(chatId, `Choose a variant for *${productName}*:`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: variantButtons }
  });
}

// --- Add product to cart ---
function addToCart(chatId, category, productName, variantName, price) {
  if (!carts[chatId]) carts[chatId] = [];

  // Check if already in cart, increase qty
  let found = false;
  for (const item of carts[chatId]) {
    if (
      item.product === productName &&
      item.variant === variantName
    ) {
      item.quantity++;
      found = true;
      break;
    }
  }
  if (!found) {
    carts[chatId].push({
      category,
      product: productName,
      variant: variantName,
      price: Number(price),
      quantity: 1
    });
  }
  bot.sendMessage(chatId, `Added *${productName}${variantName ? ' ('+variantName+')' : ''}* - ₱${price} to your cart.`, { parse_mode: 'Markdown' });

  // Show next options
  showPostAddOptions(chatId);
}

// --- Show options after adding product ---
function showPostAddOptions(chatId) {
  const options = [
    [{ text: 'Add more products', callback_data: 'backToCategories' }],
    [{ text: 'View Cart / Checkout', callback_data: 'checkout' }]
  ];
  bot.sendMessage(chatId, "What would you like to do next?", {
    reply_markup: { inline_keyboard: options }
  });
}

// --- Show cart and total ---
function showCart(chatId) {
  const cart = carts[chatId] || [];
  if (cart.length === 0) {
    return bot.sendMessage(chatId, "Your cart is empty.");
  }

  let message = "*Your Cart:*\n\n";
  let total = 0;
  for (const item of cart) {
    let price = item.price;
    // Apply discount for Maxman per Pad
    if (item.product === "Maxman per Pad") {
      price = price - 50;
    }
    const subtotal = price * item.quantity;
    message += `- ${item.product}${item.variant ? ' (' + item.variant + ')' : ''} x${item.quantity}: ₱${subtotal}\n`;
    total += subtotal;
  }
  message += `\n*Total: ₱${total}*`;

  const buttons = [
    [{ text: "⬅️ Add more products", callback_data: 'backToCategories' }],
    [{ text: "Confirm Order", callback_data: 'confirmOrder' }],
    [{ text: "Clear Cart", callback_data: 'clearCart' }]
  ];

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

// --- Clear cart ---
function clearCart(chatId) {
  carts[chatId] = [];
  bot.sendMessage(chatId, "Your cart has been cleared.");
  sendCategories(chatId);
}

// --- Start command ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome to Kutabare Online Shop! Ready to shop?");
  sendCategories(chatId);
});

// --- Handle callback queries ---
bot.on('callback_query', (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  if (data === 'backToCategories') {
    sendCategories(chatId);
  } else if (data === 'checkout') {
    showCart(chatId);
  } else if (data === 'clearCart') {
    clearCart(chatId);
  } else if (data === 'confirmOrder') {
    bot.sendMessage(chatId, "Thank you for your order! We'll contact you soon to confirm payment and delivery details.");
    // Here you would save order to DB and trigger payment flow
  } else if (data.startsWith('category|')) {
    const category = data.split('|')[1];
    sendProducts(chatId, category);

  } else if (data.startsWith('product|')) {
    const parts = data.split('|');
    const category = parts[1];
    const productName = parts[2];
    sendVariants(chatId, category, productName);

  } else if (data.startsWith('variant|')) {
    const parts = data.split('|');
    const category = parts[1];
    const productName = parts[2];
    const variantName = parts[3];
    const price = parts[4];
    addToCart(chatId, category, productName, variantName, price);

  } else if (data.startsWith('back|')) {
    const category = data.split('|')[1];
    sendProducts(chatId, category);
  }

  // Acknowledge callback query to remove loading state
  bot.answerCallbackQuery(callbackQuery.id);
});
