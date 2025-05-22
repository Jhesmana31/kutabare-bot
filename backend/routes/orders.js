// routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status and/or QR code URL and notify customer
router.post('/orders/:id/update', async (req, res) => {
  const { status, qrCodeUrl } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let notifyMessages = [];

    if (status && status !== order.status) {
      order.status = status;
      const statusMessages = {
        Confirmed: 'Your order has been confirmed! Thank you for ordering.',
        Preparing: 'Good news! Your order is now being prepared.',
        Enroute: 'Your order is on the way! Please be ready to receive it.',
        Delivered: 'Your order has been delivered. Enjoy!',
      };
      if (statusMessages[status]) notifyMessages.push(statusMessages[status]);
    }

    if (qrCodeUrl && qrCodeUrl !== order.qrCodeUrl) {
      order.qrCodeUrl = qrCodeUrl;
      notifyMessages.push('Here is your payment QR code. Please scan to pay and confirm your order.');
    }

    await order.save();

    for (const msg of notifyMessages) {
      if (msg.includes('QR code')) {
        await bot.sendPhoto(order.telegramId, qrCodeUrl, { caption: msg });
      } else {
        await bot.sendMessage(order.telegramId, msg);
      }
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
