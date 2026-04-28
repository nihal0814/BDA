import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import GetRisk from './pages/GetRisk'
import Recommendations from './pages/Recommendations'
import Dashboard from './pages/Dashboard'
import WellnessCoach from './pages/WellnessCoach'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/risk"           element={<GetRisk />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/wellness-coach" element={<WellnessCoach />} />
          <Route path="*"               element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
