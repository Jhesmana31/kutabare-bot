const OrderSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
  },
  items: [
    {
      name: String,
      variant: String,  // add variant here if needed
      quantity: Number,
    },
  ],
  contact: {  // or rename to phone to match frontend
    type: String,
    required: true,
  },
  deliveryOption: {
    type: String,
    required: true,
  },
  total: {  // add total price if you want to store it
    type: Number,
  },
  status: {
    type: String,
    default: 'Pending Payment',
  },
  proofImage: {
    type: String, // Telegram file_id
  },
  qrFile: {   // add if you want to store QR image file_id or URL
    type: String,
  },
}, { timestamps: true });
