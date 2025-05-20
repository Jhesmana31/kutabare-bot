const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const orderRoutes = require('./routes/orders');

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Kutabare backend is running!");
});

app.use('/api/orders', orderRoutes);
app.use('/api/order', orderRoutes); // accepts singular too

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => console.error(err));
