const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { sendTelegramMessage } = require('../telegram');

router.post('/', async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

    const newOrder = new Order(req.body);
    const saved = await newOrder.save();
    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, qrUrl } = req.body;
  const order = await Order.findByIdAndUpdate(id, { status, qrUrl }, { new: true });

  let msg = '';
  if (status === 'Order Received') msg = `Yay! Natanggap na namin ang order mo. Chill ka lang ha? Soon e-enjoy mo na 'yan!`;
  else if (status === 'Being Prepared') msg = `Umuusok na sa kusina—prepping na ang order mo! Konti na lang!`;
  else if (status === 'En Route') msg = `Ayan na siya, bes! Papunta na ang spicy delivery mo. Stay naughty!`;

  if (msg) sendTelegramMessage(order.telegramId, msg);
  if (qrUrl) sendTelegramMessage(order.telegramId, `Here's your QR code for payment:\n${qrUrl}`);

  res.json(order);
});

module.exports = router;
