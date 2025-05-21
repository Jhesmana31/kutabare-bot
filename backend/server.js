const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const Order = require('./models/Order');

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID; // your Telegram ID to receive order alerts
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // your bot token

// Create order endpoint
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const order = new Order(orderData);
    await order.save();

    // Notify admin on Telegram
    const adminMessage = `
New Order Received!
Name: ${order.name}
Contact: ${order.contact}
Delivery: ${order.deliveryOption}
${order.deliveryOption === 'Delivery' ? 'Address: ' + order.address : 'Pick up at Evangelista St. Pavia'}
Products:
${order.products.map(p => `${p.name} x${p.quantity} - Php ${p.price * p.quantity}`).join('\n')}
Total: Php ${order.totalAmount}
Payment Status: ${order.paymentStatus}
Order ID: ${order._id}
    `;
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_ADMIN_ID,
      text: adminMessage
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders (for dashboard)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order (for payment QR upload and status updates)
app.put('/api/orders/:id', async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // If payment QR link is added, notify customer
    if (req.body.paymentQRCodeUrl) {
      const customerMsg = `Hi ${updated.name}, here is your payment QR code. Please pay to confirm your order.\n${req.body.paymentQRCodeUrl}`;
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: updated.telegramId,
        text: customerMsg,
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Connect MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => console.error(err));
