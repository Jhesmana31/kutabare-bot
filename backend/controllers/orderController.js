const Order = require('../models/Order');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function notifyCustomer(chatId, message) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Telegram notification failed:', err.message);
  }
}

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    const saved = await order.save();
    res.status(201).json(saved);

    // Optional: notify admin or customer here
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get order' });
  }
};

// Update order and notify customer on status/payment changes
exports.updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    let notifyMsg = '';

    if (req.body.paymentStatus) {
      notifyMsg = `Hello! Your order *#${updated._id}* has been marked as *${req.body.paymentStatus}*. Thank you for your payment!`;
    }

    if (req.body.status) {
      notifyMsg = `Update for order *#${updated._id}*: Status changed to *${req.body.status}*.`;
    }

    if (notifyMsg) {
      await notifyCustomer(updated.telegramId, notifyMsg);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
};

// Delete order (optional)
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
};
