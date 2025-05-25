const express = require('express');
const multer = require('multer');
const Order = require('../models/Order');
const { bot } = require('../bot'); // adjust if different
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-qr', upload.single('qr'), async (req, res) => {
  try {
    const { orderId } = req.body;
    const fileBuffer = req.file.buffer;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const sent = await bot.telegram.sendPhoto(order.userId, {
      source: fileBuffer,
    }, {
      caption: 'Here’s your QR code for payment. Upload proof once done!',
    });

    order.qrSent = true;
    order.qrFileId = sent.photo[sent.photo.length - 1].file_id;
    await order.save();

    res.json({ message: 'QR sent successfully!', file_id: order.qrFileId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send QR' });
  }
});

module.exports = router;
