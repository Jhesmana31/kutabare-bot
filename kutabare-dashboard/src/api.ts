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
  qrFile?: string; // optional, if you want to track uploaded QR filename
}

export const fetchOrders = () => {
  return axios.get<Order[]>(`${BASE_URL}/api/orders`);
};

export const updateOrderStatus = (orderId: string, status: string) => {
  return axios.put(`${BASE_URL}/api/orders/${orderId}`, { status });
};

export const uploadOrderQR = (orderId: string, file: File) => {
  const formData = new FormData();
  formData.append('qr', file);

  return axios.post(`${BASE_URL}/api/upload-qr/${orderId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
