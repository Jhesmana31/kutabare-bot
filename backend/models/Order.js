const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  telegramId: String,
  customerName: String,
  contactNumber: String,
  address: String,
  deliveryOption: String,
  items: [
    {
      product: String,
      variant: String,
      quantity: Number,
      price: Number
    }
  ],
  total: Number,
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Progress', 'Delivered'],
    default: 'Pending'
  },
  proofImage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);
