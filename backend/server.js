require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
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
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;

  if (message.text === '/start') {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Welcome! Send your order as JSON like this:\n{"name":"John Doe","phone":"09123456789","address":"Some St","items":[{"name":"Cock Ring","qty":2}],"total":300}',
    });
    return res.sendStatus(200);
  }

  let orderData;
  try {
    orderData = JSON.parse(message.text);
  } catch {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Sorry, I could not understand your order. Please send your order as JSON like this:\n{"name":"John Doe","phone":"09123456789","address":"Some St","items":[{"name":"Cock Ring","qty":2}],"total":300}',
    });
    return res.sendStatus(200);
  }

  if (!orderData.name || !orderData.phone || !orderData.items || !orderData.total) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Missing fields in your order. Please include name, phone, items, and total.',
    });
    return res.sendStatus(200);
  }

  try {
    const newOrder = new Order({
      telegramId: chatId,
      name: orderData.name,
      phone: orderData.phone,
      address: orderData.address || '',
      items: orderData.items,
      total: orderData.total,
    });
    await newOrder.save();

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `Thanks ${orderData.name}! Your order was received.\nTotal: ₱${orderData.total}\nWe will send you the payment QR code soon.`,
    });
  } catch (err) {
    console.error('Error saving order:', err);
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'There was an error processing your order. Please try again later.',
    });
  }

  res.sendStatus(200);
});

// Get all orders (for dashboard)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Upload QR code and notify user
app.post('/upload-qr/:id', upload.single('qr'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send('Order not found');

    order.qrFile = req.file.filename;
    await order.save();

    await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: order.telegramId,
      photo: `${WEBHOOK_URL}/uploads/${order.qrFile}`,
      caption: `Here's your QR for payment. Total: ₱${order.total}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Upload QR error:', err);
    res.status(500).json({ error: 'Failed to upload QR code' });
  }
});

app.listen(PORT, async () => {
  try {
    // Use axios.post for setWebhook with form params or axios.get with params
    const response = await axios.post(`${TELEGRAM_API}/setWebhook`, null, {
      params: { url: `${WEBHOOK_URL}/bot${BOT_TOKEN}` },
    });
    if (response.data.ok) {
      console.log('Webhook set successfully');
    } else {
      console.error('Webhook set failed:', response.data);
    }
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error('Error setting webhook:', err.message);
  }
});
