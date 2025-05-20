import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Orders from './pages/Orders'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Orders />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
