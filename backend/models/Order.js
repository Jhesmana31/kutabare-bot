const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
  },
  items: [
    {
      name: String,
      variant: String,    // added variant
      quantity: Number,
    },
  ],
  phone: {               // renamed from contact to phone
    type: String,
    required: true,
  },
  deliveryOption: {
    type: String,
    required: true,
  },
  total: {               // added total price
    type: Number,
  },
  status: {
    type: String,
    default: 'Pending Payment',
  },
  proofImage: {
    type: String,       // Telegram file_id for proof of payment
  },
  qrFile: {              // added qrFile for QR code upload
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
