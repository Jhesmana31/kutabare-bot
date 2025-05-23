require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
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
  .catch(err => console.error('MongoDB connection error:', err));

// File upload config
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Models
const Order = require('./models/Order');

// Telegram bot
const bot = require('./telegram'); // telegram.js exports the bot
const ADMIN_CHAT_ID = 7721709933;

// Set Webhook
bot.setWebHook(`${process.env.BACKEND_URL}/bot${process.env.BOT_TOKEN}`);

// Telegram webhook route
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
}); 

// Save new order
app.post('/api/orders', async (req, res) => {
  try {
    console.log('Received order payload:', req.body); // Debug log

    const { telegramId, items, deliveryOption, contact, total } = req.body;

    if (!telegramId || !items || !contact || !total) {
      console.warn('Missing required fields:', req.body);
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
    console.log('Order saved to database:', newOrder._id);

    await bot.sendMessage(ADMIN_CHAT_ID,
      `New order received!\n` +
      `Items: ${JSON.stringify(newOrder.items)}\n` +
      `Contact: ${newOrder.phone}\n` +
      `Delivery: ${newOrder.deliveryOption}\n` +
      `Total: ${newOrder.total}\n` +
      `Order ID: ${newOrder._id}`
    );

    res.status(201).json({ message: 'Order saved', orderId: newOrder._id });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload QR and send to customer
app.post('/api/upload-qr/:orderId', upload.single('qr'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.qrFile = req.file.filename;
    await order.save();

    const photoUrl = `${process.env.BACKEND_URL}/uploads/${order.qrFile}`;

    await bot.sendPhoto(order.telegramId, photoUrl, {
      caption: 'Scan this QR code to pay. Thank you!'
    });

    res.status(200).json({ message: 'QR uploaded and sent to customer!' });
  } catch (err) {
    console.error('QR upload/send error:', err);
    res.status(500).json({ error: 'Failed to upload/send QR' });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/', (req, res) => res.send('Kutabare backend live!'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
