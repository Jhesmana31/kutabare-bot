const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  telegramId: { type: String, required: true },
  phone: { type: String, required: true },
  items: { type: Array, required: true },
  total: { type: Number, required: true },
  deliveryOption: { type: String, default: 'Pickup' },
  qrFile: { type: String }, // filename for the QR image
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
