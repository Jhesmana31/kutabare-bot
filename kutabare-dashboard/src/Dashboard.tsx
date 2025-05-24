import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Chip,
} from '@mui/material';
import { fetchOrders, Order } from './api';

function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders()
      .then(res => setOrders(res.data))
      .catch(err => {
        console.error('Fetch error:', err);
        setOrders([]);
      });
  }, []);

  return (
    <Box sx={{ backgroundColor: '#0d0d1a', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          sx={{
            color: '#f72585',
            mb: 5,
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '0 0 5px #f72585',
          }}
        >
          Kutabare Order Dashboard
        </Typography>

        {orders.length === 0 ? (
          <Typography sx={{ color: '#ccc', textAlign: 'center' }}>
            No orders found.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {orders.map(order => (
              <Grid item xs={12} md={6} key={order._id}>
                <Card
                  sx={{
                    background: 'linear-gradient(145deg, #1a1a2e, #2c2c54)',
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(114, 9, 183, 0.3)',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: '0 0 20px rgba(247, 37, 133, 0.5)',
                    },
                  }}
                >
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
                          sx={{
                            m: 0.5,
                            backgroundColor: '#7209b7',
                            color: '#fff',
                          }}
                        />
                      ))}
                    </Box>

                    <Box mt={2}>
                      <Chip
                        label={`Status: ${order.status || 'Pending'}`}
                        sx={{
                          backgroundColor: '#3a0ca3',
                          color: '#fff',
                          fontWeight: 'bold',
                        }}
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

export default Dashboard;
