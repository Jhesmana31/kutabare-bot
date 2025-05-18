const fs = require('fs');
const path = require('path');

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json')));

const handleStart = async (ctx) => {
  const categories = [...new Set(products.map(p => p.category))];
  const buttons = categories.map(c => [{ text: c }]);

  await ctx.reply('Choose a product category:', {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
    },
  });
};

const handleOrder = async (ctx) => {
  const message = ctx.message.text;
  const category = message.trim();
  const filtered = products.filter(p => p.category === category);

  if (filtered.length > 0) {
    for (const item of filtered) {
      const caption = `${item.name} - ₱${item.price}`;
      await ctx.reply(caption);
    }
  } else {
    await ctx.reply('Please choose a valid category by tapping the buttons.');
  }
};

module.exports = { handleStart, handleOrder };
