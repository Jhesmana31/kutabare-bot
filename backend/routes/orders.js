const express = require('express');
const router = express.Router();
const Order = require('../models/order');

// POST create new order
router.post('/', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ message: 'Order placed!', order });
  } catch (err) {
    res.status(400).json({ message: 'Failed to place order', error: err.message });
  }
});

// GET all orders (for dashboard/admin use)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('products.productId');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

module.exports = router;
