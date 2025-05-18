const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController');

// Create a new order
router.post('/create', createOrder);

// Get all orders
router.get('/', getOrders);

// Get order by ID
router.get('/:id', getOrderById);

// Update order status
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
