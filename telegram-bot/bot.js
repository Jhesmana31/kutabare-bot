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
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const session = getSession(chatId);
  const data = query.data;

  // Handle category selection
  if (data.startsWith('cat_')) {
    const category = data.slice(4);
    session.currentCategory = category;
    session.state = 'CHOOSING_PRODUCT';

    // List products in category
    const prods = products[category];
    if (!prods || prods.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: "No products in this category." });
      return;
    }

    const keyboard = prods.map((p, i) => [{ text: p.name, callback_data: `prod_${i}` }]);
    keyboard.push([{ text: "Back to Categories", callback_data: "back_categories" }]);

    await bot.editMessageText(`Category: ${category}\nChoose a product:`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: keyboard },
    });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Go back to category list
  if (data === 'back_categories') {
    session.state = 'CHOOSING_CATEGORY';
    session.currentCategory = null;
    session.currentProduct = null;
    session.currentVariant = null;

    await bot.editMessageText("Choose a category:", {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getCategoriesKeyboard(),
    });
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Handle product selection
  if (data.startsWith('prod_') && session.currentCategory) {
    const prodIndex = parseInt(data.slice(5));
    const product = products[session.currentCategory][prodIndex];
    if (!product) {
      await bot.answerCallbackQuery(query.id, { text: "Invalid product." });
      return;
    }
    session.currentProduct = product;
    session.state = 'CHOOSING_VARIANT_OR_QUANTITY';

    // Check if product has variants
    if (product.variants) {
      // If variants are simple array of strings or objects with name and price
      let variantButtons;
      if (Array.isArray(product.variants)) {
        variantButtons = product.variants.map((v, i) => {
          if (typeof v === 'string') {
            return [{ text: v, callback_data: `var_${i}` }];
          } else {
            return [{ text: `${v.name} - ₱${v.price}`, callback_data: `var_${i}` }];
          }
        });
      }

      variantButtons.push([{ text: "Back to Products", callback_data: "back_products" }]);

      await bot.editMessageText(
        `Product: ${product.name}\nChoose a variant:`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: variantButtons },
        }
      );
    } else {
      // No variants, ask quantity
      session.currentVariant = null;
      session.state = 'CHOOSING_QUANTITY';
      await bot.editMessageText(
        `Product: ${product.name}\nPrice: ₱${product.price}\n\nPlease enter quantity (number):`,
        { chat_id: chatId, message_id: query.message.message_id }
      );
    }

    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Back to product list in category
  if (data === 'back_products' && session.currentCategory) {
    const prods = products[session.currentCategory];
    const keyboard = prods.map((p, i) => [{ text: p.name, callback_data: `prod_${i}` }]);
    keyboard.push([{ text: "Back to Categories", callback_data: "back_categories" }]);

    session.state = 'CHOOSING_PRODUCT';
    session.currentProduct = null;
    session.currentVariant = null;

    await bot.editMessageText(
      `Category: ${session.currentCategory}\nChoose a product:`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: keyboard },
      }
    );
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // Handle variant selection
  if (data.startsWith('var_') && session.currentProduct) {
    const varIndex = parseInt(data.slice(4));
    let variant = session.currentProduct.variants[varIndex];

    // Normalize variant to object with name and price
    if (typeof variant === 'string') {
      variant = { name: variant, price: session.currentProduct.price };
    }
    session.currentVariant = variant;
    session.state = 'CHOOSING_QUANTITY';

    await bot.editMessageText(
      `Product: ${session.currentProduct.name}\nVariant: ${variant.name}\nPrice: ₱${variant.price}\n\nPlease enter quantity (number):`,
      { chat_id: chatId, message_id: query.message.message_id }
    );

    await bot.answerCallbackQuery(query.id);
    return;
  }
});
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  // Only process text messages if we're expecting quantity or contact info
  if (!msg.text) return;

  if (session.state === 'CHOOSING_QUANTITY') {
    const qty = parseInt(msg.text);
    if (isNaN(qty) || qty <= 0) {
      await bot.sendMessage(chatId, "Please enter a valid quantity (a positive number).");
      return;
    }

    // Add item to cart
    const product = session.currentProduct;
    const variant = session.currentVariant;
    const item = {
      productName: product.name,
      variantName: variant ? variant.name : null,
      price: variant ? variant.price : product.price,
      quantity: qty,
      total: qty * (variant ? variant.price : product.price),
    };

    if (!session.cart) session.cart = [];
    session.cart.push(item);

    session.state = 'ASK_MORE';

    // Show current cart summary
    let cartSummary = 'Your cart:\n';
    session.cart.forEach((i, idx) => {
      cartSummary += `${idx + 1}. ${i.productName}`;
      if (i.variantName) cartSummary += ` (${i.variantName})`;
      cartSummary += ` x${i.quantity} = ₱${i.total}\n`;
    });
    const totalAmount = session.cart.reduce((sum, i) => sum + i.total, 0);

    // Ask if user wants to add more or proceed
    await bot.sendMessage(chatId, cartSummary + `\nTotal: ₱${totalAmount}\n\nDo you want to add more products?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Yes, add more', callback_data: 'add_more' }],
          [{ text: 'No, proceed to delivery', callback_data: 'proceed_delivery' }],
        ],
      },
    });
  }
});

// Handle add_more and proceed_delivery button presses
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const session = getSession(chatId);
  const data = query.data;

  if (data === 'add_more') {
    session.state = 'CHOOSING_CATEGORY';
    session.currentCategory = null;
    session.currentProduct = null;
    session.currentVariant = null;

    await bot.editMessageText("Choose a category:", {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getCategoriesKeyboard(),
    });
    await bot.answerCallbackQuery(query.id);
  }

  if (data === 'proceed_delivery') {
    session.state = 'CHOOSING_DELIVERY';

    await bot.editMessageText("Choose delivery option:", {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "Pick-up", callback_data: "delivery_pickup" }],
          [{ text: "Same-day Delivery", callback_data: "delivery_delivery" }],
        ],
      },
    });
    await bot.answerCallbackQuery(query.id);
  }

  // Delivery option selected
  if (data === 'delivery_pickup' || data === 'delivery_delivery') {
    session.deliveryOption = data === 'delivery_pickup' ? 'Pick-up' : 'Same-day Delivery';
    session.state = 'ASK_CONTACT';

    await bot.editMessageText(
      `You chose: ${session.deliveryOption}.\nPlease share your contact number for order updates.`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          keyboard: [[{ text: "Share contact", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    await bot.answerCallbackQuery(query.id);
  }
});

// Handle contact sharing
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (session.state === 'ASK_CONTACT') {
    if (msg.contact && msg.contact.phone_number) {
      session.contact = msg.contact.phone_number;
      session.state = 'ORDER_CONFIRM';

      // Summary message before payment
      let summary = 'Order Summary:\n';
      session.cart.forEach((i, idx) => {
        summary += `${idx + 1}. ${i.productName}`;
        if (i.variantName) summary += ` (${i.variantName})`;
        summary += ` x${i.quantity} = ₱${i.total}\n`;
      });
      const totalAmount = session.cart.reduce((sum, i) => sum + i.total, 0);
      summary += `\nDelivery: ${session.deliveryOption}`;
      summary += `\nContact: ${session.contact}`;
      summary += `\n\nPlease proceed to payment.`;

      await bot.sendMessage(chatId, summary);
      // TODO: Generate payment link and send here

    } else {
      await bot.sendMessage(chatId, "Please share your contact number by pressing the button.");
    }
  }
});
const adminChatId = YOUR_TELEGRAM_ID; // replace with your Telegram user ID

// Function to generate payment link (mock example)
function generatePaymentLink(order) {
  // You will integrate your Netbank QRPH or other payment API here.
  // For demo, return a dummy link with amount and order id.
  const orderId = Date.now();
  return `https://pay.netbank.ph/qrph?amount=${order.totalAmount}&orderId=${orderId}`;
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (session.state === 'ORDER_CONFIRM') {
    // After summary, expect user to confirm order by typing "pay" or similar
    if (msg.text && msg.text.toLowerCase().includes('pay')) {
      const totalAmount = session.cart.reduce((sum, i) => sum + i.total, 0);

      // Prepare order details for admin and payment
      const order = {
        cart: session.cart,
        deliveryOption: session.deliveryOption,
        contact: session.contact,
        totalAmount,
        customerId: chatId,
      };

      // Generate payment link
      const paymentLink = generatePaymentLink(order);

      // Send payment link to user
      await bot.sendMessage(chatId, `Please pay using this link:\n${paymentLink}`);

      // Notify admin with order details
      let adminMsg = `New Order Received:\nCustomer ID: ${chatId}\nContact: ${order.contact}\nDelivery: ${order.deliveryOption}\nOrder details:\n`;
      order.cart.forEach((item, idx) => {
        adminMsg += `${idx + 1}. ${item.productName}`;
        if (item.variantName) adminMsg += ` (${item.variantName})`;
        adminMsg += ` x${item.quantity} = ₱${item.total}\n`;
      });
      adminMsg += `Total Amount: ₱${order.totalAmount}\nPayment Link: ${paymentLink}`;

      await bot.sendMessage(adminChatId, adminMsg);

      // Clear session to start fresh next time
      clearSession(chatId);

      await bot.sendMessage(chatId, "Thank you! Your order has been sent to the admin. Please complete your payment and keep the receipt.");
    } else {
      await bot.sendMessage(chatId, 'Type "pay" when you are ready to get the payment link.');
    }
  }
});
