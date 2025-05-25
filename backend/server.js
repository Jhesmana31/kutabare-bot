const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;
const bot = new Telegraf(process.env.BOT_TOKEN);

// In-memory user carts { userId: [ { name, price } ] }
const userCarts = {};

// Full product catalog with categories, products, variants and prices
const catalog = {
  "Cock Rings & Toys": {
    "Cock Ring - Pack of 3": { price: 80 },
    "Cock Ring Vibrator": { price: 60 },
    "Spikey Jelly (Red)": { price: 160 },
    "Spikey Jelly (Black)": { price: 160 },
    "\"Th Bolitas\" Jelly": { price: 160 },
    "Portable Wired Vibrator Egg": { price: 130 },
    "Delay Collar": { price: 200 },
    "Delay Ejaculation Buttplug": { price: 200 },
    "7 Inches African Version Dildo": { price: 270 },
    "Masturbator Cup": {
      price: 120,
      variants: {
        "Yellow (Mouth)": 120,
        "Gray (Arse)": 120,
        "Black (Vagina)": 120
      }
    }
  },
  "Lubricants & Condoms": {
    "Monogatari Lube Tube": { price: 120 },
    "Monogatari Lube Pinhole": { price: 120 },
    "Monogatari Flavored Lube": {
      price: 200,
      variants: {
        "Peach": 200,
        "Strawberry": 200,
        "Cherry": 200
      }
    },
    "Ultra thin 001 for men natural latex condom": {
      price: 90,
      variants: {
        "Black": 90,
        "Long Battle": 90,
        "Blue": 90,
        "Naked Pleasure": 90,
        "Granule Passion": 90
      }
    }
  },
  "Performance Enhancers": {
    "Maxman per Tab": { price: 40 },
    "Maxman per Pad": { price: 400 } // note discount handled manually if needed
  },
  "Essentials": {
    "Eucalyptus Menthol Food Grade": {
      variants: {
        "15-20 (1k)": 1000,
        "25-30 (1.5k)": 1500,
        "35-40 (2k)": 2000
      }
    },
    "Insulin Syringe": { price: 20 },
    "Sterile Water for Injection": { price: 15 }
  },
  "Mouth Fresheners": {
    "Mouth Fresheners": {
      variants: {
        "Peach": 90,
        "Mint": 90
      }
    }
  }
};

// Helper function to safely add item to user cart
function addToCart(userId, name, price) {
  if (!userCarts[userId]) userCarts[userId] = [];
  userCarts[userId].push({ name, price });
}

// Start command
bot.start(ctx => {
  ctx.reply('Welcome sa Kutabare Online Shop! Type /menu para simulan ang landian.');
});

// Show categories menu
bot.command('menu', async (ctx) => {
  const categories = Object.keys(catalog);
  const buttons = categories.map(cat => [{ text: cat, callback_data: `category_${cat}` }]);

  try {
    await ctx.reply('Pili ng category:', {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    console.error('Error sending menu:', err);
  }
});

// View cart command
bot.command('cart', (ctx) => {
  const userId = ctx.from.id;
  const cart = userCarts[userId] || [];
  if (cart.length === 0) {
    return ctx.reply('Wala ka pang items sa cart mo. /menu para magshop.');
  }

  let message = 'Cart mo:\n\n';
  let total = 0;
  cart.forEach((item, i) => {
    message += `${i + 1}. ${item.name} - ₱${item.price}\n`;
    total += item.price;
  });
  message += `\nTotal: ₱${total}`;

  const buttons = [
    [{ text: 'Check Out', callback_data: 'checkout' }],
    [{ text: 'Add More', callback_data: 'add_more' }]
  ];

  ctx.reply(message, { reply_markup: { inline_keyboard: buttons } });
});

// Callback query handler for category, product, variant, add to cart etc
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  // Show products for a category
  if (data.startsWith('category_')) {
    const category = data.substring(9);
    const products = Object.keys(catalog[category] || {});
    if (products.length === 0) {
      return ctx.answerCbQuery('Walang product sa category na ito.');
    }
    const buttons = products.map(p => [{ text: p, callback_data: `product_${category}_${p}` }]);
    try {
      await ctx.editMessageText(`Pili ng product sa ${category}:`, {
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (err) {
      if (!err.message.includes('message is not modified')) {
        console.error(err);
      }
    }
    return ctx.answerCbQuery();
  }

  // Show variants for a product or add to cart directly if no variants
  if (data.startsWith('product_')) {
    const [_, category, ...productParts] = data.split('_');
    const productName = productParts.join('_');
    const product = catalog[category]?.[productName];
    if (!product) return ctx.answerCbQuery('Product not found.');

    if (product.variants) {
      // Show variants
      const buttons = Object.keys(product.variants).map(variant => [{
        text: variant,
        callback_data: `variant_${category}_${productName}_${variant}`
      }]);
      try {
        await ctx.editMessageText(`Pili ng variant para sa ${productName}:`, {
          reply_markup: { inline_keyboard: buttons }
        });
      } catch (err) {
        if (!err.message.includes('message is not modified')) {
          console.error(err);
        }
      }
    } else {
      // No variants - add to cart directly
      addToCart(userId, productName, product.price);
      await ctx.answerCbQuery(`${productName} naidagdag sa cart mo!`);
      await ctx.editMessageText(`Nagdagdag kami ng ${productName} sa cart mo! Type /cart para makita.`);
    }
    return ctx.answerCbQuery();
  }

  // Add variant product to cart
  if (data.startsWith('variant_')) {
    const [_, category, ...rest] = data.split('_');
    const variant = rest.pop();
    const productName = rest.join('_');
    const product = catalog[category]?.[productName];
    if (!product || !product.variants || !(variant in product.variants)) {
      return ctx.answerCbQuery('Variant not found.');
    }

    const price = product.variants[variant];
    const itemName = `${productName} - ${variant}`;
    addToCart(userId, itemName, price);

    await ctx.answerCbQuery(`${itemName} naidagdag sa cart mo!`);
    await ctx.editMessageText(`Nagdagdag kami ng ${itemName} sa cart mo! Type /cart para makita.`);
    return ctx.answerCbQuery();
  }

  // Handle cart buttons
  if (data === 'checkout') {
    // For simplicity, just reply
    await ctx.answerCbQuery();
    await ctx.reply('Thank you for checking out! I-process namin order mo soon.');
    userCarts[userId] = []; // Clear cart after checkout
  }

  if (data === 'add_more') {
    // Show categories again
    const categories = Object.keys(catalog);
    const buttons = categories.map(cat => [{ text: cat, callback_data: `category_${cat}` }]);
    try {
      await ctx.editMessageText('Pili ng category:', {
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (err) {
      if (!err.message.includes('message is not modified')) {
        console.error(err);
      }
    }
    await ctx.answerCbQuery();
  }
});

// Start Express server
app.get('/', (req, res) => {
  res.send('Kutabare Telegram bot server is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot started.');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
