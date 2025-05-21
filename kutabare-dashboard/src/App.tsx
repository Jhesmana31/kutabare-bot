import React from 'react';

function App() {
  const stats = [
    { label: 'Received', count: 3, color: '#ff5ec7' },
    { label: 'Preparing', count: 2, color: '#60f5e5' },
    { label: 'Enroute', count: 1, color: '#ffcc70' },
  ];

  return (
    <div style={{ backgroundColor: '#1a0033', minHeight: '100vh', padding: '2rem', color: '#fff' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/logo.png" alt="Kutabare Logo" style={{ height: '80px', marginBottom: '1rem' }} />
        <h1 style={{ color: '#ff5ec7' }}>Kutabare Order Dashboard</h1>
        <p style={{ color: '#60f5e5' }}>Track and manage customer orders</p>
      </header>

      <section style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {stats.map((stat, index) => (
          <div key={index} style={{
            backgroundColor: '#2b004d',
            padding: '1rem 2rem',
            borderRadius: '1rem',
            textAlign: 'center',
            boxShadow: `0 0 10px ${stat.color}`,
            flex: '1 1 150px',
            maxWidth: '200px',
          }}>
            <h2 style={{ color: stat.color }}>{stat.count}</h2>
            <p>{stat.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;
