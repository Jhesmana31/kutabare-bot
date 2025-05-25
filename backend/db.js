const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'your_mongo_connection_string_here';

const client = new MongoClient(mongoUri, { useUnifiedTopology: true });

let db;
let cartsCollection;
let ordersCollection;

async function connectDB() {
  await client.connect();
  db = client.db(); // use default DB from URI or specify db name here
  cartsCollection = db.collection('carts');
  ordersCollection = db.collection('orders');
  console.log('Connected to MongoDB');
}

function getCartsCollection() {
  return cartsCollection;
}

function getOrdersCollection() {
  return ordersCollection;
}

module.exports = { connectDB, getCartsCollection, getOrdersCollection };
