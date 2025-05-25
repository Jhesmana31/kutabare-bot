const multer = require('multer');
const path = require('path');
const Order = require('../models/Order');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

router.post('/upload-proof/:orderId', upload.single('proof'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.proofImage = req.file.filename;
    await order.save();

    // Notify admin via bot if available
    const bot = req.app.get('bot');
    if (bot) {
      const photoUrl = `${process.env.BACKEND_URL}/uploads/${order.proofImage}`;
      bot.sendPhoto(process.env.ADMIN_ID, photoUrl, {
        caption: `New proof of payment uploaded for order ID: ${order._id}`
      });
    }

    res.status(200).json({ message: 'Proof uploaded' });
  } catch (err) {
    console.error('Upload proof error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});
