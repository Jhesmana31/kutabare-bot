const productsData = require('./data/products');
const axios = require('axios');
const userSessions = {};

const ADMIN_TELEGRAM_ID = '7699555744'; // your Telegram ID
const REACT_DASHBOARD_ENDPOINT = 'https://your-render-backend.onrender.com/api/orders'; // replace with your actual URL

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

    if (!userSessions[chatId]) userSessions[chatId] = { cart: [] };

    // Category
    if (data.startsWith('cat_')) {
      const catName = data.replace('cat_', '');
      const category = productsData.categories.find(c => c.name === catName);
      if (!category) return;

      const buttons = category.products.map((p, i) => [
        { text: `${p.name} - ₱${p.price}`, callback_data: `prod_${catName}_${i}` }
      ]);
      buttons.push([{ text: 'Back to Categories', callback_data: 'back_to_categories' }]);

      bot.editMessageText(`Products in "${catName}"`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: buttons }
      });
    }

    // Back
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
      const category = productsData.categories.find(c => c.name === catName);
      const product = category.products[parseInt(prodIndex)];

      if (product.variants) {
        bot.editMessageText(`Choose a variant for *${product.name}*`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: product.variants.map(v => [
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
      const category = productsData.categories.find(c => c.name === catName);
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

    // View Cart
    else if (data === 'view_cart') {
      const cart = userSessions[chatId]?.cart || [];
      if (cart.length === 0) return bot.sendMessage(chatId, 'Your cart is empty!');

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
            [{ text: 'Proceed to Checkout', callback_data: 'checkout' }]
          ]
        }
      });
    }

    // Checkout
    else if (data === 'checkout') {
      bot.sendMessage(chatId, 'Delivery or Pickup?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Delivery', callback_data: 'method_delivery' }],
            [{ text: 'Pick Up', callback_data: 'method_pickup' }]
          ]
        }
      });
    }

    // Delivery Method
    else if (data === 'method_delivery') {
      userSessions[chatId].method = 'Delivery';
      bot.sendMessage(chatId, 'Please send your full delivery address:');
    }

    else if (data === 'method_pickup') {
      userSessions[chatId].method = 'Pick Up';
      userSessions[chatId].address = 'Pick up at: QGGR+46W, Evangelista St, Pavia, Iloilo\nhttps://maps.app.goo.gl/Z7kb8ZBxJ6LZShKP8';
      bot.sendMessage(chatId, userSessions[chatId].address);
      bot.sendMessage(chatId, 'Please send your contact number:');
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const session = userSessions[chatId];

    if (!session) return;

    if (session.method === 'Delivery' && !session.address) {
      session.address = msg.text;
      bot.sendMessage(chatId, 'Please send your contact number:');
    } else if (!session.contact && session.address) {
      session.contact = msg.text;

      // Send summary
      const cart = session.cart;
      let summary = `*New Order from @${msg.from.username || msg.from.first_name}*\n\n`;
      cart.forEach((item, i) => {
        summary += `${i + 1}. ${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} = ₱${item.price * item.quantity}\n`;
      });
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      summary += `\n*Total:* ₱${total}\n`;
      summary += `\n*Method:* ${session.method}\n*Address:* ${session.address}\n*Contact:* ${session.contact}`;

      bot.sendMessage(chatId, 'Thank you! Your order has been received.');
      bot.sendMessage(ADMIN_TELEGRAM_ID, summary, { parse_mode: 'Markdown' });

      // Send to dashboard
      try {
        await axios.post(REACT_DASHBOARD_ENDPOINT, {
          chatId,
          user: msg.from.username || msg.from.first_name,
          cart,
          total,
          method: session.method,
          address: session.address,
          contact: session.contact
        });
      } catch (err) {
        console.error('Failed to notify dashboard:', err.message);
      }

      delete userSessions[chatId];
    }
  });
};

function sendQuantityPicker(bot, chatId, messageId, name, price, variant, catName) {
  const buttons = [1, 2, 3, 4, 5].map(qty => [
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
