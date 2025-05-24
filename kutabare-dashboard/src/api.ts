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
  qrFile?: string; // optional filename/url of uploaded QR
}

// Fetch all orders
export const fetchOrders = () => {
  return axios.get<Order[]>(`${BASE_URL}/api/orders`);
};

// Update order status explicitly
export const updateOrderStatus = (orderId: string, status: string) => {
  return axios.put(`${BASE_URL}/api/orders/${orderId}`, { status });
};

// Update order status to next stage in timeline
export const updateNextStatus = async (order: Order) => {
  const timeline = ['Received', 'Order Confirmed', 'Preparing', 'Enroute'];
  const currentIndex = timeline.indexOf(order.status || 'Received');
  if (currentIndex === -1 || currentIndex === timeline.length - 1) {
    return null; // no next status
  }
  const nextStatus = timeline[currentIndex + 1];
  const response = await updateOrderStatus(order._id, nextStatus);
  return response.data;
};

// Upload QR code image file for order
export const uploadOrderQR = (orderId: string, file: File) => {
  const formData = new FormData();
  formData.append('qr', file);

  return axios.post(`${BASE_URL}/api/upload-qr/${orderId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
