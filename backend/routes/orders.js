const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  updateOrderStatus,
  uploadQR,
} = require('../controllers/orderController');

router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrderStatus);
router.post('/upload-qr/:id', uploadQR);

module.exports = router;
