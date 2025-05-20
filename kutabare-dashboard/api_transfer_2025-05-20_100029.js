import axios from 'axios'

const API_BASE = 'https://kutabare-backend.onrender.com/api'

export const getOrders = async () => {
  const res = await axios.get(`${API_BASE}/orders`)
  return res.data
}