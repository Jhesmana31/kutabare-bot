// Dummy data - replace with your DB logic later
let orders = [];

const createOrder = (req, res) => {
  const newOrder = {
    id: orders.length + 1,
    ...req.body,
    status: 'pending',
    createdAt: new Date(),
  };
  orders.push(newOrder);
  res.status(201).json({ message: 'Order created', order: newOrder });
};

const getOrders = (req, res) => {
  res.json(orders);
};

const getOrderById = (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  res.json(order);
};

const updateOrderStatus = (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  order.status = status;
  res.json({ message: 'Order status updated', order });
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
