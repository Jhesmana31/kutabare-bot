import React from 'react'

const OrderCard = ({ order }) => {
  return (
    <div className="border rounded-xl p-4 shadow bg-white">
      <h2 className="font-semibold">{order.name}</h2>
      <p>Phone: {order.phone}</p>
      <p>Items: {order.items.map(item => item.name).join(', ')}</p>
      <p>Total: ₱{order.total}</p>
      <p>Status: {order.status}</p>
    </div>
  )
}

export default OrderCard