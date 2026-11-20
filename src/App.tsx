import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoyaltyProvider } from './context/LoyaltyContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Transactions from './pages/Transactions';
import Segments from './pages/Segments';
import Trends from './pages/Trends';

export default function App() {
  return (
    <BrowserRouter>
      <LoyaltyProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/segments" element={<Segments />} />
              <Route path="/trends" element={<Trends />} />
            </Routes>
          </main>
        </div>
      </LoyaltyProvider>
    </BrowserRouter>
  );
}
