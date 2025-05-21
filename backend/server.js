require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const orderSchema = new mongoose.Schema({
  telegramId: String,
  name: String,
  phone: String,
  address: String,
  items: Array,
  total: Number,
  status: { type: String, default: 'pending' },
  qrFile: String,
});

const Order = mongoose.model('Order', orderSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Telegram webhook handler
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if (!message) return res.send();

  const chatId = message.chat.id;

  if (message.text === '/start') {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Welcome! Type anything to order.',
    });
  }

  // Here you would add your order receiving and processing logic
  // Save orders to MongoDB and notify admin React dashboard as needed

  res.send();
});

// Get all orders (for React dashboard)
app.get('/orders', async (req, res) => {
  const orders = await Order.find().sort({ _id: -1 });
  res.json(orders);
});

// Upload QR code image for order and notify customer
app.post('/upload-qr/:id', upload.single('qr'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).send('Order not found');

  order.qrFile = req.file.filename;
  await order.save();

  await axios.post(`${TELEGRAM_API}/sendPhoto`, {
    chat_id: order.telegramId,
    photo: `${WEBHOOK_URL}/uploads/${order.qrFile}`,
    caption: `Here's your QR for payment. Total: ₱${order.total}`,
  });

  res.send({ success: true });
});

app.listen(PORT, async () => {
  try {
    await axios.post(`${TELEGRAM_API}/setWebhook`, {
      url: `${WEBHOOK_URL}/bot${BOT_TOKEN}`,
    });
    console.log('Webhook set and server running on port', PORT);
  } catch (err) {
    console.error('Error setting webhook:', err.message);
  }
});
