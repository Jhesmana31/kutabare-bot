import { useEffect, useState } from 'react'; import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { motion } from 'framer-motion'; import axios from 'axios';

interface Order { _id: string; name: string; product: string; status: string; }

export default function Dashboard() { const [orders, setOrders] = useState<Order[]>([]);

useEffect(() => { fetchOrders(); }, []);

const fetchOrders = async () => { const res = await axios.get('/api/orders'); setOrders(res.data); };

const updateStatus = async (id: string, newStatus: string) => { await axios.post('/api/update-order', { id, status: newStatus }); fetchOrders(); };

return ( <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-4"> <header className="text-center mb-6"> <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-pink-400"> Kutabare Online Shop </motion.h1> <p className="text-teal-300">Order Dashboard</p> </header>

<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
    {orders.map(order => (
      <Card key={order._id} className="bg-white text-black shadow-xl rounded-2xl">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold">{order.name}</h2>
          <p className="text-gray-700">Product: {order.product}</p>
          <p className="text-sm mt-1">Status: {order.status}</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => updateStatus(order._id, 'Preparing')}>Preparing</Button>
            <Button onClick={() => updateStatus(order._id, 'Out for delivery')}>Deliver</Button>
            <Button onClick={() => updateStatus(order._id, 'Completed')}>Done</Button>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
</div>

); }

