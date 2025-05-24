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
  items: [
    {
      name: String,
      variant: String,
      price: Number,
      quantity: Number
    }
  ],
  total: {
    type: Number,
    required: true
  },
  deliveryOption: {
    type: String,
    enum: ['Pickup', 'Same-day Delivery'],
    default: 'Pickup'
  },
  qrFile: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
