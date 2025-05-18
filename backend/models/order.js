const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: String,
  phoneNumber: String,
  products: Array,
  totalAmount: Number,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
