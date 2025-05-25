const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
  },
  items: [
    {
      name: String,
      quantity: Number,
    },
  ],
  contact: {
    type: String,
    required: true,
  },
  deliveryOption: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'Pending Payment',
  },
  proofImage: {
    type: String, // Telegram file_id
  },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
