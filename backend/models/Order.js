const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: Array,
  deliveryOption: String,
  contact: String,
  status: {
    type: String,
    default: 'Pending',
  },
  qrUrl: String,
  telegramId: String,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);


