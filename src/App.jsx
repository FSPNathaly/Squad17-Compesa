import { useState } from 'react'
import reactLogo from './assets/react.svg'
import { Route, Routes } from 'react-router'
import { Home } from './pages/home'

function App() {

  return (
    <Routes>
      <Route path='/' element={<Home />} />
    </Routes>
  )
}

export default App
