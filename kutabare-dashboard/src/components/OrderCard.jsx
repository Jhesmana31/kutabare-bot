export default function OrderCard({ order }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-2">{order.customerName}</h2>
      <p><strong>Contact:</strong> {order.contact}</p>
      <p><strong>Delivery:</strong> {order.deliveryOption}</p>
      <ul className="mt-2">
        {order.items.map((item, index) => (
          <li key={index}>• {item.name} — ₱{item.price}</li>
        ))}
      </ul>
      <p className="mt-2 font-semibold">Status: {order.status}</p>
    </div>
  )
}
