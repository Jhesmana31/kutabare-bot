import axios from 'axios';

const BASE_URL = 'https://kutabare-backend.onrender.com'; // or your correct Render backend URL

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
