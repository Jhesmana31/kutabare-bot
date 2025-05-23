const TelegramBot = require('node-telegram-bot-api'); const { getCategories, getProductList } = require('./data/products');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false }); // Webhook-based, not polling

bot.onText(//start/, (msg) => { const chatId = msg.chat.id;

bot.sendMessage(chatId, 'Yo! Welcome sa Kutabare Online Shop! Pili na sa mga pampasarap, boss!', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [ [{ text: '🛒 View Products', callback_data: 'view_products' }], [{ text: '📦 My Orders', callback_data: 'my_orders' }] ] } }); });

bot.on('callback_query', async (query) => { const chatId = query.message.chat.id; const data = query.data;

if (data === 'view_products') { const categories = getCategories(); const categoryButtons = categories.map(cat => ([{ text: cat, callback_data: cat_${encodeURIComponent(cat)} }]));

bot.sendMessage(chatId, 'Anong trip mo today? Pili ka ng category:', {
  reply_markup: {
    inline_keyboard: categoryButtons
  }
});

}

else if (data.startsWith('cat_')) { const category = decodeURIComponent(data.replace('cat_', '')); const products = getProductList(category);

if (products.length === 0) {
  return bot.sendMessage(chatId, `Walang laman ang category na 'yan bossing. Pili ka muna ng iba.`);
}

const keyboard = products.map(p => ([{
  text: `${p.name} - ₱${p.price}`,
  callback_data: `prod_${encodeURIComponent(p.name)}`
}]));
keyboard.push([{ text: '« Back to Categories', callback_data: 'view_products' }]);

return bot.sendMessage(chatId, `Ayan na! Pili na kung anong pampasarap ang gusto mo:`, {
  reply_markup: { inline_keyboard: keyboard }
});

}

else if (data.startsWith('prod_')) { const productName = decodeURIComponent(data.replace('prod_', '')); const allProducts = getProductList(); const product = allProducts.find(p => p.name === productName);

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

bot.sendMessage(chatId, `*${product.name}*

Price: ₱${product.price}`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: variantButtons } }); }

else if (data.startsWith('cart_')) { const [, nameEncoded, variantEncoded] = data.split(''); const name = decodeURIComponent(nameEncoded); const variant = decodeURIComponent(variantEncoded);

const keyboard = [[{ text: '🧾 Place Order', callback_data: `order_${encodeURIComponent(name)}_${encodeURIComponent(variant)}` }]];

bot.sendMessage(chatId, `Added *${name}* (${variant !== 'noVariant' ? variant : 'No Variant'}) to cart mo, boss.`, {
  parse_mode: 'Markdown',
  reply_markup: { inline_keyboard: keyboard }
});

}

else if (data.startsWith('order_')) { const [, nameEncoded, variantEncoded] = data.split(''); const name = decodeURIComponent(nameEncoded); const variant = decodeURIComponent(variantEncoded);

// Notify admin (replace with actual admin ID)
const adminId = 7699555744; // Your Telegram ID
bot.sendMessage(adminId, `ORDER ALERT!

Item: ${name} Variant: ${variant !== 'noVariant' ? variant : 'None'} From: ${chatId}`);

// Confirm to buyer
bot.sendMessage(chatId, `Ayos! Order confirmed for *${name}* (${variant !== 'noVariant' ? variant : 'No Variant'}).

Hintayin mo lang ang QR or payment link na ipapadala ko once ready ha.`, { parse_mode: 'Markdown' }); } });

module.exports = bot;

