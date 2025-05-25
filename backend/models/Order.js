const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  telegramId: String,
  items: [{ name: String, price: Number }],
  deliveryOption: String,
  contact: String,
  status: String,
  paymentProofFileId: String,
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
