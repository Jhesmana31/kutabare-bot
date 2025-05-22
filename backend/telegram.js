const productsData = require('./data/products');
const userSessions = {};

module.exports = (bot) => {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userSessions[chatId] = { cart: [] };
    bot.sendMessage(chatId, `Welcome to Kutabare Online Shop, mainit at masarap!  
Choose a category to get started:`, {
      reply_markup: {
        inline_keyboard: productsData.categories.map((cat) => [
          { text: cat.name, callback_data: `cat_${cat.name}` }
        ])
      }
    });
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Category selected
    if (data.startsWith('cat_')) {
      const catName = data.replace('cat_', '');
      const category = productsData.categories.find((c) => c.name === catName);
      if (!category) return;

      const productButtons = category.products.map((p, i) => [
        { text: `${p.name} - ₱${p.price}`, callback_data: `prod_${catName}_${i}` }
      ]);

      productButtons.push([{ text: 'Back to Categories', callback_data: 'back_to_categories' }]);

      bot.editMessageText(`Products in "${catName}"`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: productButtons }
      });
    }

    // Back to categories
    else if (data === 'back_to_categories') {
      bot.editMessageText('Choose a category:', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: productsData.categories.map((cat) => [
            { text: cat.name, callback_data: `cat_${cat.name}` }
          ])
        }
      });
    }

    // Product selected
    else if (data.startsWith('prod_')) {
      const [_, catName, prodIndex] = data.split('_');
      const category = productsData.categories.find((c) => c.name === catName);
      const product = category.products[parseInt(prodIndex)];

      if (product.variants) {
        bot.editMessageText(`Choose a variant for *${product.name}*`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: product.variants.map((v) => [
              { text: v, callback_data: `variant_${catName}_${prodIndex}_${v}` }
            ]).concat([[{ text: 'Back', callback_data: `cat_${catName}` }]])
          }
        });
      } else {
        sendQuantityPicker(bot, chatId, query.message.message_id, product.name, product.price, null, catName);
      }
    }

    // Variant selected
    else if (data.startsWith('variant_')) {
      const [_, catName, prodIndex, ...variantArr] = data.split('_');
      const variant = variantArr.join('_');
      const category = productsData.categories.find((c) => c.name === catName);
      const product = category.products[parseInt(prodIndex)];
      sendQuantityPicker(bot, chatId, query.message.message_id, product.name, product.price, variant, catName);
    }

    // Add to cart
    else if (data.startsWith('addcart_')) {
      const [_, name, price, quantity, variant] = data.split('_');
      const item = {
        name: decodeURIComponent(name),
        price: parseFloat(price),
        quantity: parseInt(quantity),
        variant: variant === 'null' ? null : decodeURIComponent(variant)
      };
      userSessions[chatId].cart.push(item);

      bot.editMessageText(`Added to cart: ${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Back to Categories', callback_data: 'back_to_categories' }],
            [{ text: 'View Cart / Checkout', callback_data: 'view_cart' }]
          ]
        }
      });
    }

    // View cart
    else if (data === 'view_cart') {
      const cart = userSessions[chatId]?.cart || [];
      if (cart.length === 0) {
        return bot.sendMessage(chatId, 'Your cart is empty!');
      }

      let msg = `*Your Cart:*\n\n`;
      let total = 0;
      cart.forEach((item, i) => {
        const line = `${i + 1}. ${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} = ₱${item.price * item.quantity}`;
        msg += line + '\n';
        total += item.price * item.quantity;
      });
      msg += `\n*Total:* ₱${total}`;

      bot.sendMessage(chatId, msg, {
        parse_mode: 'Markdown',
        reply_markup: {
           inline_keyboard: [
    [{ text: 'Proceed to Checkout', callback_data: 'checkout' }],
    [{ text: 'Back to Categories', callback_data: 'back_to_categories' }]
  ]
}
      });
    }
  });
};

function sendQuantityPicker(bot, chatId, messageId, name, price, variant, catName) {
  const buttons = [1, 2, 3, 4, 5].map((qty) => [
    {
      text: `Qty: ${qty}`,
      callback_data: `addcart_${encodeURIComponent(name)}_${price}_${qty}_${encodeURIComponent(variant)}`
    }
  ]);
  buttons.push([{ text: 'Back', callback_data: `cat_${catName}` }]);

  bot.editMessageText(`How many *${name}${variant ? ` (${variant})` : ''}* would you like?`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}
