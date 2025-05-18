const { Bot } = require('grammy');
const config = require('./config');
const { handleStart, handleOrder } = require('./services/handlers');

const bot = new Bot(config.BOT_TOKEN);

bot.command('start', handleStart);
bot.on('message:text', handleOrder);

bot.start();
console.log('Bot is running...');
