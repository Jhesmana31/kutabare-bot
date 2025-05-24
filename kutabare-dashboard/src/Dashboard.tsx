import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip } from '@mui/material';
import { fetchOrders, Order } from './api';

function App() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders().then(res => setOrders(res.data)).catch(err => console.error(err));
  }, []);

  return (
    <Box sx={{ backgroundColor: '#1a1a2e', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ color: '#f72585', mb: 3, fontWeight: 'bold', textAlign: 'center' }}>
          Kutabare Orders Dashboard
        </Typography>

        {orders.length === 0 ? (
          <Typography sx={{ color: 'white', textAlign: 'center' }}>No orders found.</Typography>
        ) : (
          <Grid container spacing={3}>
            {orders.map(order => (
              <Grid item xs={12} key={order._id}>
                <Card sx={{ backgroundColor: '#2c2c54', color: '#fff', boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#00f5d4' }}>Order ID: {order._id}</Typography>
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
                    <Box mt={2}>
                      <Chip
                        label={`Status: ${order.status || 'Pending'}`}
                        sx={{ backgroundColor: '#3a0ca3', color: 'white' }}
                      />
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

export default App;
