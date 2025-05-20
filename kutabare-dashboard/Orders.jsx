import React, { useEffect, useState } from 'react'
import { getOrders } from '../lib/api'
import OrderCard from '../components/OrderCard'

const Orders = () => {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    getOrders().then(setOrders)
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Customer Orders</h1>
      <div className="grid gap-4">
        {orders.map(order => <OrderCard key={order._id} order={order} />)}
      </div>
    </div>
  )
}

export default Orders