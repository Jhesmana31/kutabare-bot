const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: String,
  variant: { type: String, default: 'noVariant' },
  price: Number,
  quantity: Number,
});

const OrderSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  phone: String,
  items: [ItemSchema],
  total: Number,
  deliveryOption: { type: String, default: 'Pickup' },
  qrFile: String,
  paymentProof: String,
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Awaiting Proof', 'Payment Confirmed', 'Rejected'],
    default: 'Pending',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', OrderSchema);
