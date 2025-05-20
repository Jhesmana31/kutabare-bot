const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
