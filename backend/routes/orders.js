const express = require('express');
const multer = require('multer');
const path = require('path');
const Order = require('../models/Order');

const router = express.Router();

// File upload setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// POST create new order
router.post('/', async (req, res) => {
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

    // Notify admin on Telegram (bot instance will be attached in server.js)
    if (req.app.get('bot')) {
      const bot = req.app.get('bot');
      bot.sendMessage(process.env.ADMIN_CHAT_ID, 
        `New order received!\n` +
        `Items: ${JSON.stringify(newOrder.items)}\n` +
        `Contact: ${newOrder.phone}\n` +
        `Delivery: ${newOrder.deliveryOption}\n` +
        `Total: ${newOrder.total}\n` +
        `Order ID: ${newOrder._id}`
      ).catch(console.error);
    }

    res.status(201).json({ message: 'Order saved', orderId: newOrder._id });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all orders (admin dashboard)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST upload QR code and send photo to customer
router.post('/upload-qr/:orderId', upload.single('qr'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.qrFile = req.file.filename;
    await order.save();

    const photoUrl = `${process.env.BACKEND_URL}/uploads/${order.qrFile}`;

    if (req.app.get('bot')) {
      const bot = req.app.get('bot');
      await bot.sendPhoto(order.telegramId, photoUrl, {
        caption: 'Scan this QR code to pay. Thank you!'
      });
    }

    res.status(200).json({ message: 'QR uploaded and sent to customer!' });
  } catch (err) {
    console.error('QR upload/send error:', err);
    res.status(500).json({ error: 'Failed to upload/send QR' });
  }
});

module.exports = router;
