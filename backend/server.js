const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// Set webhook URL (optional if you already set it manually once)
bot.setWebHook(`${process.env.BACKEND_URL}/bot${process.env.BOT_TOKEN}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
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

// Routes
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

app.post('/api/upload-qr/:orderId', upload.single('qr'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.qrFile = req.file.filename;
    await order.save();

    // Send QR to customer via Telegram
    const axios = require('axios');
    const botUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`;
    await axios.post(botUrl, {
      chat_id: order.telegramId,
      photo: `${process.env.BACKEND_URL}/uploads/${order.qrFile}`,
      caption: 'Scan this QR to pay for your order. Let me know once paid, ha!'
    });

    res.status(200).json({ message: 'QR uploaded and sent!' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload/send QR' });
  }
});

app.get('/', (req, res) => res.send('Kutabare backend live!'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
