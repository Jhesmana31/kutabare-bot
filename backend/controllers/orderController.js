const Order = require('../models/Order');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '7368568730:AAHbnlzq6a3aSxrFstJ12caHiUmn8aW7txw';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const ADMIN_CHAT_ID = 'YOUR_ADMIN_TELEGRAM_ID'; // replace with your Telegram user ID (number as string)

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

async function notifyAdmin(message) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Telegram admin notification failed:', err.message);
  }
}

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    const saved = await order.save();
    res.status(201).json(saved);

    // Notify admin about new order
    const adminMsg = `New order received!\nOrder ID: *#${saved._id}*\nCustomer: ${saved.customerName || 'Unknown'}\nTotal: ₱${saved.total || 'N/A'}`;
    await notifyAdmin(adminMsg);

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

// Update order and notify customer and admin on status/payment changes
exports.updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    let notifyMsg = '';

    if (req.body.paymentStatus) {
      notifyMsg = `Hello! Your order *#${updated._id}* has been marked as *${req.body.paymentStatus}*. Thank you for your payment!`;
    }

    if (req.body.orderStatus) {
      notifyMsg = `Update for order *#${updated._id}*: Status changed to *${req.body.orderStatus}*.`;
    }

    if (notifyMsg) {
      await notifyCustomer(updated.telegramId, notifyMsg);
      // Notify admin about update too
      const adminUpdateMsg = `Order *#${updated._id}* updated.\nPayment Status: ${updated.paymentStatus || '-'}\nOrder Status: ${updated.orderStatus || '-'}`;
      await notifyAdmin(adminUpdateMsg);
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
