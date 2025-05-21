import React from 'react';

// Replace this with your actual logo path or URL


const orders = [
  {
    id: 1,
    customer: 'Juan Dela Cruz',
    product: 'Cock Ring Pack of 3',
    quantity: 2,
    status: 'Pending',
  },
  {
    id: 2,
    customer: 'Maria Clara',
    product: 'Monogatari Flavored Lube (Peach)',
    quantity: 1,
    status: 'Completed',
  },
];

const statusColors: Record<string, string> = {
  Pending: '#f59e0b',
  Completed: '#10b981',
  Cancelled: '#ef4444',
};

export default function App() {
  return (
    <div style={{
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      backgroundColor: '#1E1E2F',
      minHeight: '100vh',
      color: '#eee',
      padding: 20,
    }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
        <img src={logo} alt="Kutabare Logo" style={{ height: 50, marginRight: 20 }} />
        <h1 style={{ fontWeight: 'bold', fontSize: 28, color: '#D946EF' }}>
          Kutabare Online Shop - Orders
        </h1>
      </header>

      {/* Orders container */}
      <div style={{
        display: 'grid',
        gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      }}>
        {orders.map(order => (
          <div
            key={order.id}
            style={{
              backgroundColor: '#2A2A3F',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <h2 style={{ margin: '0 0 10px', color: '#A78BFA' }}>{order.product}</h2>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Customer:</strong> {order.customer}
            </p>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Quantity:</strong> {order.quantity}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Status:</strong>{' '}
              <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                backgroundColor: statusColors[order.status] || '#888',
                color: 'white',
                fontWeight: '600',
              }}>
                {order.status}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
