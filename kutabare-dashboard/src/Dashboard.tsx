import React, { useEffect, useState, ChangeEvent } from 'react';
import {
  Container, Typography, Box, Card, CardContent,
  Grid, Chip, Button,
} from '@mui/material';
import io from 'socket.io-client';
import { fetchOrders, Order, updateNextStatus, uploadOrderQR } from './api';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'https://kutabare-backend.onrender.com');

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders().then(res => setOrders(res.data));
    socket.on('newOrder', (order: Order) => setOrders(prev => [order, ...prev]));
    socket.on('orderUpdated', (updated: Order) =>
      setOrders(prev => prev.map(o => (o._id === updated._id ? updated : o)))
    );
    return () => {
      socket.off('newOrder');
      socket.off('orderUpdated');
    };
  }, []);

  const handleNextStatus = async (order: Order) => {
    setLoading(true);
    await updateNextStatus(order).catch(() => alert('Failed to update status.'));
    setLoading(false);
  };

  const handleQRUpload = async (orderId: string, file: File) => {
    setUploadingId(orderId);
    try {
      await uploadOrderQR(orderId, file);
      alert('QR uploaded & sent to customer.');
    } catch {
      alert('Upload failed.');
    }
    setUploadingId(null);
  };

  const onFileChange = (orderId: string) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleQRUpload(orderId, e.target.files[0]);
    e.target.value = '';
  };

  return (
    <Box sx={{ backgroundColor: '#1a1a2e', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{
          color: '#f72585', mb: 3, fontWeight: 'bold', textAlign: 'center',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          Kutabare Orders Dashboard
        </Typography>

        <Grid container spacing={3}>
          {orders.map(order => (
            <Grid item xs={12} key={order._id}>
              <Card sx={{ backgroundColor: '#2c2c54', color: '#fff' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#00f5d4' }}>
                    Order ID: {order._id}
                  </Typography>
                  <Typography>Telegram: {order.telegramId}</Typography>
                  <Typography>Contact: {order.phone}</Typography>
                  <Typography>Delivery: {order.deliveryOption}</Typography>
                  <Typography>Total: ₱{order.total}</Typography>
                  <Box mt={1}>
                    {order.items.map((item, i) => (
                      <Chip key={i} label={`${item.name} (${item.variant}) x${item.quantity || 1}`} sx={{ m: 0.5 }} />
                    ))}
                  </Box>
                  <Box mt={2} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip label={`Status: ${order.status || 'Received'}`} />
                    <Button
                      onClick={() => handleNextStatus(order)}
                      disabled={loading}
                      variant="contained"
                      sx={{ backgroundColor: '#f72585' }}
                    >
                      Next Status
                    </Button>

                    <label htmlFor={`upload-${order._id}`} style={{
                      backgroundColor: '#7209b7', padding: '6px 12px',
                      borderRadius: 4, color: 'white', cursor: 'pointer'
                    }}>
                      {uploadingId === order._id ? 'Uploading...' : 'Upload QR'}
                    </label>
                    <input
                      id={`upload-${order._id}`}
                      type="file"
                      accept="image/*"
                      onChange={onFileChange(order._id)}
                      style={{ display: 'none' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default Dashboard;
