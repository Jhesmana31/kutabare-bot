import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface OrderItem {
  name: string;
  variant: string;
  quantity?: number;
}

export interface Order {
  _id: string;
  telegramId: string;
  phone: string;
  items: OrderItem[];
  deliveryOption: string;
  total: number;
  status?: string;
}

export const fetchOrders = () => {
  return axios.get<Order[]>(`${BASE_URL}/api/orders`);
};

export const updateOrderStatus = (orderId: string, status: string) => {
  return axios.put(`${BASE_URL}/api/orders/${orderId}`, { status });
};
