const { telegramAdminId } = require('../config');
const products = require('../products/products');

let userOrders = {};

function startOrder(userId) {
  userOrders[userId] = {
    stage: 'category',
    cart: [],
  };
}

function getCategories() {
  const categories = [...new Set(products.map(p => p.category))];
  return categories;
}

function getProductsByCategory(category) {
  return products.filter(p => p.category === category);
}

function addToCart(userId, productName, variant) {
  const product = products.find(p => p.name === productName);
  if (!product) return false;

  const price = product.price;
  const selectedVariant = variant || (product.variants?.[0] ?? null);

  userOrders[userId].cart.push({
    name: product.name,
    variant: selectedVariant,
    price,
  });

  return true;
}

function getOrderSummary(userId) {
  const cart = userOrders[userId]?.cart || [];
  const items = cart.map(item => `• ${item.name}${item.variant ? ` (${item.variant})` : ''} - ₱${item.price}`);
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  return {
    items: items.join('\n'),
    total,
  };
}

function clearOrder(userId) {
  delete userOrders[userId];
}

module.exports = {
  startOrder,
  getCategories,
  getProductsByCategory,
  addToCart,
  getOrderSummary,
  clearOrder,
  userOrders,
};
