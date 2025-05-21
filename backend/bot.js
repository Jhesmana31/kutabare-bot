const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const orderRoutes = require('./routes/orderRoutes');
const bot = require('./telegram'); // loads the bot logic
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Telegram webhook endpoint
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.send('Server is live!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  const botInstance = new TelegramBot(process.env.BOT_TOKEN);
  await botInstance.setWebHook(`${process.env.BACKEND_URL}/bot${process.env.BOT_TOKEN}`);
  console.log('Webhook set!');
});
