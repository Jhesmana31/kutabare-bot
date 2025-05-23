import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

export const fetchOrders = () => {
  return axios.get(`${BASE_URL}/api/orders`);
};

export const updateOrderStatus = (orderId, status) => {
  return axios.put(`${BASE_URL}/api/orders/${orderId}`, { status });
};
