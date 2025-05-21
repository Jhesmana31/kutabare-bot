import React, { useEffect, useState } from 'react';

const API_URL = 'https://kutabare-backend.onrender.com/api/orders';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      alert('Failed to load orders');
    }
  }

  function handleFileChange(e) {
    setQrFile(e.target.files[0]);
  }

  async function uploadQR(orderId) {
    // [same code as before...]
  }

  const styles = {
    container: {
      maxWidth: 900,
      margin: 'auto',
      padding: 20,
      backgroundColor: '#2a0b3d',
      minHeight: '100vh',
      color: '#f7f1fa',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    logo: {
      display: 'block',
      margin: '0 auto 10px auto',
      maxWidth: '200px',
      filter: 'drop-shadow(0 0 8px #ff48a0)',
    },
    header: {
      color: '#ff48a0',
      textAlign: 'center',
      marginBottom: 20,
      fontWeight: 'bold',
      textShadow: '0 0 8px #ff48a0',
    },
    // [rest of styles...]
  };

  return (
    <div style={styles.container}>
      <img src="/logo.png" alt="Kutabare Logo" style={styles.logo} />
      <h1 style={styles.header}>Kutabare Online Shop - Order Dashboard</h1>

      {/* [rest of dashboard...] */}
