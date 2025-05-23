import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { fetchOrders, updateOrderStatus } from './api';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchOrders();
      setOrders(res.data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to load orders', severity: 'error' });
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setSnackbar({ open: true, message: 'Order status updated', severity: 'success' });
      loadOrders();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Kutabare Orders Dashboard</Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer Telegram ID</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Delivery</TableCell>
                <TableCell>Total (₱)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Update Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No orders found
                  </TableCell>
                </TableRow>
              )}

              {orders.map(order => (
                <TableRow key={order._id}>
                  <TableCell>{order._id}</TableCell>
                  <TableCell>{order.telegramId}</TableCell>
                  <TableCell>{order.phone}</TableCell>
                  <TableCell>
                    {order.items.map((item, i) =>
                      <div key={i}>
                        {item.name} {item.variant !== 'noVariant' ? `(${item.variant})` : ''} x {item.quantity || 1}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{order.deliveryOption}</TableCell>
                  <TableCell>{order.total.toFixed(2)}</TableCell>
                  <TableCell>{order.status || 'Pending'}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleUpdateStatus(order._id, 'Processing')}
                      sx={{ mr: 1 }}
                    >
                      Processing
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      onClick={() => handleUpdateStatus(order._id, 'Completed')}
                    >
                      Completed
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
