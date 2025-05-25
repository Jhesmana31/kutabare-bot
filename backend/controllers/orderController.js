const Order = require('../models/Order');
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN);

// GET all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE order status
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    await bot.sendMessage(order.telegramId, `Order status updated to: *${status}*`, {
      parse_mode: 'Markdown',
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload QR and notify customer
exports.uploadQR = async (req, res) => {
  const { id } = req.params;
  const { qrFileId } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(id, { qrFileId }, { new: true });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    await bot.sendPhoto(order.telegramId, qrFileId, {
      caption: 'Here’s your payment QR. Kindly upload your proof of payment after sending.',
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
