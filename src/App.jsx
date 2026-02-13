import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import History from './assets/History';
import './App.css';

function NavBar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span style={{ fontSize: '1.8rem' }}>🎒</span>
        <span>Smart Bag Pro</span>
      </div>

      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          หน้าหลัก
        </Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>
          ประวัติ
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}
