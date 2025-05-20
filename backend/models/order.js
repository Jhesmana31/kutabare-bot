const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  telegramId: { type: String, required: true },
  name: String,
  contact: String,
  deliveryOption: String,
  address: String,
  products: [
    {
      name: String,
      price: Number,
      quantity: Number,
    }
  ],
  totalAmount: Number,
  paymentStatus: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
