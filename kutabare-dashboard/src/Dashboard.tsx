import React, { useEffect, useState, ChangeEvent } from 'react';
import {
  Container, Typography, Box, Card, CardContent,
  Grid, Chip, Button, Input,
} from '@mui/material';
import { fetchOrders, Order, updateNextStatus, uploadOrderQR } from './api';

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const loadOrders = () => {
    fetchOrders()
      .then(res => setOrders(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleNextStatus = async (order: Order) => {
    setLoading(true);
    try {
      const response = await updateNextStatus(order);
      if (response) {
        loadOrders();
      } else {
        alert('Order is already at the last status or status unknown.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to update status.');
    }
    setLoading(false);
  };

  const handleQRUpload = async (orderId: string, file: File) => {
    setUploadingId(orderId);
    try {
      await uploadOrderQR(orderId, file);
      alert('QR code uploaded successfully.');
      loadOrders();
    } catch (error) {
      console.error(error);
      alert('Failed to upload QR code.');
    }
    setUploadingId(null);
  };

  const onFileChange = (orderId: string) => (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      handleQRUpload(orderId, file);
      event.target.value = ''; // Reset file input after upload
    }
  };

  return (
    <Box sx={{ backgroundColor: '#1a1a2e', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography
          variant="h4"
          sx={{
            color: '#f72585',
            mb: 3,
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: "'Orbitron', sans-serif",
          }}
        >
          Kutabare Orders Dashboard
        </Typography>

        {orders.length === 0 ? (
          <Typography sx={{ color: 'white', textAlign: 'center' }}>
            No orders found.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {orders.map(order => (
              <Grid item xs={12} key={order._id}>
                <Card sx={{ backgroundColor: '#2c2c54', color: '#fff', boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#00f5d4' }}>
                      Order ID: {order._id}
                    </Typography>
                    <Typography>Telegram ID: {order.telegramId}</Typography>
                    <Typography>Contact: {order.phone}</Typography>
                    <Typography>Delivery: {order.deliveryOption}</Typography>
                    <Typography>Total: ₱{order.total}</Typography>
                    <Box mt={1}>
                      {order.items.map((item, index) => (
                        <Chip
                          key={index}
                          label={`${item.name} (${item.variant}) x${item.quantity || 1}`}
                          color="primary"
                          sx={{ m: 0.5, backgroundColor: '#7209b7' }}
                        />
                      ))}
                    </Box>

                    <Box mt={2} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Status: ${order.status || 'Received'}`}
                        sx={{ backgroundColor: '#3a0ca3', color: 'white' }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleNextStatus(order)}
                        disabled={loading}
                        sx={{ backgroundColor: '#f72585', '&:hover': { backgroundColor: '#d90429' } }}
                      >
                        Next Status
                      </Button>

                      {/* QR Upload */}
                      <label
                        htmlFor={`upload-qr-${order._id}`}
                        style={{
                          cursor: uploadingId === order._id ? 'wait' : 'pointer',
                          backgroundColor: '#7209b7',
                          padding: '6px 12px',
                          borderRadius: 4,
                          color: 'white',
                          fontWeight: 'bold',
                          userSelect: 'none',
                        }}
                      >
                        {uploadingId === order._id ? 'Uploading...' : 'Upload QR'}
                      </label>
                      <input
                        id={`upload-qr-${order._id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={onFileChange(order._id)}
                        disabled={uploadingId === order._id}
                      />

                      {/* Show uploaded QR filename if exists */}
                      {order.qrFile && (
                        <Typography
                          sx={{
                            color: '#00f5d4',
                            fontSize: '0.8rem',
                            fontStyle: 'italic',
                          }}
                        >
                          QR Uploaded
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

export default Dashboard;
