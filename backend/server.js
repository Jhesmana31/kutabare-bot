const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// Hardcoded values (for testing — switch to env vars later)
const BOT_TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const BACKEND_URL = 'https://kutabare-backend.onrender.com';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Telegram bot webhook setup
const bot = new TelegramBot(BOT_TOKEN, { webHook: true });
bot.setWebHook(`${BACKEND_URL}/bot${BOT_TOKEN}`);

app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  console.log('Webhook received update:', req.body);
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Optional: check webhook status
app.get(`/bot${BOT_TOKEN}`, (req, res) => {
  res.send('Bot webhook is alive!');
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Mongo error:', err));

// File upload setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Order model
const Order = require('./models/Order');

// Order creation route
app.post('/api/orders', async (req, res) => {
  try {
    const { telegramId, items, deliveryOption, contact, total } = req.body;
    if (!telegramId || !items || !contact || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newOrder = new Order({
      telegramId,
      phone: contact,
      items,
      total,
      deliveryOption: deliveryOption || 'Pickup',
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order saved', orderId: newOrder._id });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload QR route
app.post('/api/upload-qr/:orderId', upload.single('qr'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.qrFile = req.file.filename;
    await order.save();

    // Send QR to customer via Telegram
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      chat_id: order.telegramId,
      photo: `${BACKEND_URL}/uploads/${order.qrFile}`,
      caption: 'Scan this QR to pay for your order. Let me know once paid, ha!',
    });

    res.status(200).json({ message: 'QR uploaded and sent!' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload/send QR' });
  }
});

app.get('/', (req, res) => {
  res.send('Kutabare backend live!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Load bot logic
require('./telegram')(bot);
