const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  telegramId: { type: String, required: true },
  name: String,
  phone: String,
  address: String,
  items: [
    {
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 }
    }
  ],
  total: Number,
  status: { type: String, default: 'pending' },
  deliveryOption: String,
  qrFile: String
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);
