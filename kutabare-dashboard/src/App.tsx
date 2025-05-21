import React, { useEffect, useState } from 'react';

type Order = {
  _id: string;
  telegramId: string;
  items: string[];
  deliveryOption: string;
  contactInfo: string;
  status: string;
  qrUrl?: string;
  createdAt: string;
};

const STATUS_OPTIONS = ['Pending', 'Order Received', 'Being Prepared', 'En Route', 'Completed'];

const BASE_URL = 'https://kutabare-backend.onrender.com/api/orders';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newQrUrl, setNewQrUrl] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE_URL);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      alert('Failed to load orders');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const startEditing = (order: Order) => {
    setEditingOrderId(order._id);
    setNewStatus(order.status);
    setNewQrUrl(order.qrUrl || '');
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setNewStatus('');
    setNewQrUrl('');
  };

  const saveChanges = async () => {
    if (!editingOrderId) return;

    try {
      const res = await fetch(`${BASE_URL}/${editingOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, qrUrl: newQrUrl }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updatedOrder = await res.json();

      setOrders((prev) =>
        prev.map((o) => (o._id === editingOrderId ? updatedOrder : o))
      );
      cancelEditing();
    } catch {
      alert('Failed to update order');
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Kutabare Order Dashboard</h1>
      {loading && <p>Loading orders...</p>}
      {!loading && orders.length === 0 && <p>No orders yet.</p>}

      <table width="100%" border={1} cellPadding={8} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#7B2FF7', color: 'white' }}>
            <th>ID</th>
            <th>Items</th>
            <th>Delivery</th>
            <th>Contact</th>
            <th>Status</th>
            <th>QR Code URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td>{order._id.slice(-6)}</td>
              <td>{order.items.join(', ')}</td>
              <td>{order.deliveryOption}</td>
              <td>{order.contactInfo}</td>
              <td>
                {editingOrderId === order._id ? (
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ padding: 4 }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : (
                  order.status
                )}
              </td>
              <td>
                {editingOrderId === order._id ? (
                  <input
                    type="text"
                    value={newQrUrl}
                    placeholder="Paste QR code URL here"
                    onChange={(e) => setNewQrUrl(e.target.value)}
                    style={{ width: '100%' }}
                  />
                ) : order.qrUrl ? (
                  <a href={order.qrUrl} target="_blank" rel="noopener noreferrer">
                    View QR
                  </a>
                ) : (
                  '-'
                )}
              </td>
              <td>
                {editingOrderId === order._id ? (
                  <>
                    <button onClick={saveChanges} style={{ marginRight: 6 }}>
                      Save
                    </button>
                    <button onClick={cancelEditing}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => startEditing(order)}>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
