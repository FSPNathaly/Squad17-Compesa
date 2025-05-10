import { useState } from 'react'
import reactLogo from './assets/react.svg'
import { Route, Routes } from 'react-router'
import { Home } from './pages/home'
import { Dashboard } from './pages/dashboard'

function App() {

  return (
    <Routes>
      <Route path='/' element={<Dashboard />} />
    </Routes>
  )
}

export default App
