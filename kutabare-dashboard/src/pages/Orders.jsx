import { useEffect, useState } from 'react'
import axios from 'axios'
import OrderCard from '../components/OrderCard'

export default function Orders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/orders`)
      .then(res => setOrders(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map(order => (
        <OrderCard key={order._id} order={order} />
      ))}
    </div>
  )
}
