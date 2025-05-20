require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const Order = require('./models/Order'); // your Order mongoose model

const app = express();
app.use(express.json());

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Telegram webhook endpoint
app.post('/webhook', (req, res) => {
  const update = req.body;
  bot.processUpdate(update);
  res.sendStatus(200);
});

// Example: Listen for orders via bot messages or commands
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // Simple order example: user sends "order [product]"
  if (text.toLowerCase().startsWith('order ')) {
    const productName = text.slice(6).trim();

    // Save order to DB
    const order = new Order({
      userId: chatId,
      product: productName,
      status: 'pending',
      createdAt: new Date(),
    });

    await order.save();

    bot.sendMessage(chatId, `Thanks! Your order for "${productName}" has been received.`);
  }
});

// API to get all orders (for React dashboard)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Start Express server on Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
