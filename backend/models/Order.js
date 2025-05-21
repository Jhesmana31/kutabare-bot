const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  telegramId: String,
  items: [String],
  deliveryOption: String,
  contactInfo: String,
  status: { type: String, default: 'Pending' },
  qrUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
