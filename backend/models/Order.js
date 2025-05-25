const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: String,
  variant: { type: String, default: 'noVariant' },
  quantity: Number,
});

const OrderSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true },
  items: [ItemSchema],
  contact: String,
  deliveryOption: { type: String, default: 'Pickup' },
  total: Number,
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

module.exports = Order;
