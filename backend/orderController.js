const mongoose = require('mongoose');
const axios = require('axios');

// Schema
const orderSchema = new mongoose.Schema({
  name: String,
  contact: String,
  products: Array,
  deliveryOption: String,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

const createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    // Notify via Telegram
    const message = `
New Order:
Name: ${order.name}
Contact: ${order.contact}
Delivery: ${order.deliveryOption}
Products: ${order.products.map(p => p.name).join(', ')}
    `;

    const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
    await axios.post(TELEGRAM_API, {
      chat_id: process.env.ADMIN_ID,
      text: message
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order creation failed' });
  }
};

module.exports = { createOrder };