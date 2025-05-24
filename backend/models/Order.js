const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  deliveryOption: {
    type: String,
    default: 'Pickup'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Completed'],
    default: 'Pending'
  },
  qrFile: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
