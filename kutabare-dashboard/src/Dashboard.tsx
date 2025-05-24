import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Input,
} from '@mui/material';
import { fetchOrders, updateOrderStatus, uploadOrderQR, Order } from './api';

const STATUS_STEPS = ['Received', 'Confirmed', 'Preparing', 'Enroute', 'Completed'];

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

  // Reload orders
  const loadOrders = () => {
    fetchOrders()
      .then(res => setOrders(res.data))
      .catch(err => console.error('Fetch orders failed:', err));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Update status to next step
  const handleNextStatus = (order: Order) => {
    const currentIndex = STATUS_STEPS.indexOf(order.status || 'Received');
    if (currentIndex === -1 || currentIndex === STATUS_STEPS.length - 1) return; // Already last step

    const nextStatus = STATUS_STEPS[currentIndex + 1];
    updateOrderStatus(order._id, nextStatus)
      .then(() => loadOrders())
      .catch(err => console.error('Status update failed:', err));
  };

  // Handle QR upload
  const handleQRUpload = (orderId: string, file: File) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [orderId]: true }));
    uploadOrderQR(orderId, file)
      .then(() => {
        loadOrders();
        setUploading(prev => ({ ...prev, [orderId]: false }));
      })
      .catch(err => {
        console.error('QR upload failed:', err);
        setUploading(prev => ({ ...prev, [orderId]: false }));
      });
  };

  return (
    <Box sx={{ backgroundColor: '#0a0a23', minHeight: '100vh', py: 4, px: 1 }}>
      <Container maxWidth="md">
        <Typography
          variant="h3"
          sx={{
            color: '#ff007f',
            fontWeight: 'bold',
            mb: 4,
            textAlign: 'center',
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 3,
          }}
        >
          Kutabare Orders Dashboard
        </Typography>

        {orders.length === 0 ? (
          <Typography sx={{ color: '#aaa', textAlign: 'center' }}>No orders found.</Typography>
        ) : (
          <Grid container spacing={3}>
            {orders.map(order => {
              const statusIndex = STATUS_STEPS.indexOf(order.status || 'Received');
              return (
                <Grid item xs={12} key={order._id}>
                  <Card sx={{ backgroundColor: '#121236', color: '#eee', boxShadow: 10 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#ff66cc', mb: 1 }}>
                        Order ID: {order._id}
                      </Typography>
                      <Typography>Telegram ID: {order.telegramId}</Typography>
                      <Typography>Contact: {order.phone}</Typography>
                      <Typography>Delivery: {order.deliveryOption}</Typography>
                      <Typography>Total: ₱{order.total}</Typography>

                      <Box mt={1} mb={2}>
                        {order.items.map((item, i) => (
                          <Chip
                            key={i}
                            label={`${item.name} (${item.variant}) x${item.quantity || 1}`}
                            sx={{
                              m: 0.5,
                              backgroundColor: '#7b2ff7',
                              color: '#fff',
                              fontWeight: 'bold',
                            }}
                          />
                        ))}
                      </Box>

                      {/* Status Timeline */}
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mb={2}>
                        {STATUS_STEPS.map((step, idx) => (
                          <Box
                            key={step}
                            sx={{
                              flex: 1,
                              textAlign: 'center',
                              color: idx <= statusIndex ? '#ff66cc' : '#555',
                              fontWeight: idx === statusIndex ? 'bold' : 'normal',
                              textShadow: idx === statusIndex ? '0 0 5px #ff66cc' : 'none',
                              cursor: idx === statusIndex && idx < STATUS_STEPS.length - 1 ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                              if (idx === statusIndex) handleNextStatus(order);
                            }}
                            title={
                              idx === statusIndex && idx < STATUS_STEPS.length - 1
                                ? 'Click to advance status'
                                : undefined
                            }
                          >
                            {step}
                          </Box>
                        ))}
                      </Stack>

                      {/* Upload QR */}
                      <Box sx={{ mt: 1 }}>
                        <Input
                          type="file"
                          inputProps={{ accept: 'image/*' }}
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleQRUpload(order._id, e.target.files[0]);
                              e.target.value = ''; // reset input
                            }
                          }}
                          disabled={uploading[order._id]}
                          sx={{ color: '#eee' }}
                        />
                        {uploading[order._id] && (
                          <Typography variant="caption" color="#ff66cc">
                            Uploading...
                          </Typography>
                        )}
                      </Box>

                      {/* Show QR filename if exists */}
                      {order.qrFile && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#aaa' }}>
                          QR Uploaded: {order.qrFile}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
