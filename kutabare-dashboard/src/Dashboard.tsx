import { useEffect, useState } from 'react';
import axios from 'axios';

interface Item {
  name: string;
  variant?: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  phone: string;
  deliveryOption: string;
  total: number;
  items: Item[];
  qrFile?: string;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get<Order[]>('/api/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const handleUpload = async (orderId: string, file: File) => {
    const formData = new FormData();
    formData.append('qr', file);
    setUploading(orderId);
    try {
      await axios.post(`/api/upload-qr/${orderId}`, formData);
      alert('QR uploaded and sent to customer');
      fetchOrders(); // refresh orders to get updated QR
    } catch {
      alert('Upload failed');
    }
    setUploading(null);
  };

  return (
    <div>
      <h1>Orders</h1>
      {orders.map(order => (
        <div key={order._id} style={{ border: '1px solid #ccc', marginBottom: 10, padding: 10 }}>
          <p><strong>Contact:</strong> {order.phone}</p>
          <p><strong>Delivery:</strong> {order.deliveryOption}</p>
          <p><strong>Total:</strong> ₱{order.total}</p>
          <p><strong>Items:</strong></p>
          <ul>
            {order.items.map((item, i) => (
              <li key={i}>
                {item.name}{item.variant ? ` (${item.variant})` : ''} x{item.quantity} - ₱{item.price}
              </li>
            ))}
          </ul>
          {!order.qrFile ? (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && e.target.files[0] && handleUpload(order._id, e.target.files[0])}
                disabled={uploading === order._id}
              />
              {uploading === order._id && <p>Uploading...</p>}
            </>
          ) : (
            <a href={`/uploads/${order.qrFile}`} target="_blank" rel="noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
              View uploaded QR
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
