const express = require('express');
const connectDB = require('./config/db');
const app = express();
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
require('dotenv').config();

connectDB();
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
