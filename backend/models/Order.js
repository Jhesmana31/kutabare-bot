const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  deliveryOption: {
    type: String,
    default: 'Pickup',
  },
  qrFile: {
    type: String, // stores filename of uploaded QR
    default: '',
  },
}, { timestamps: true }); // <<< this automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Order', orderSchema);
