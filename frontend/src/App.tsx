import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ElderlyProfile from './pages/ElderlyProfile';
import Profiles from './pages/Profiles';
import EmergencyLog from './pages/EmergencyLog'; 
import Register from './pages/Register';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard'; 

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile/:id" element={<ElderlyProfile />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/emergency-log" element={<EmergencyLog />} />
        <Route path="/register" element={<Register />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* NEW ADMIN ROUTE */}
        <Route path="/admin" element={<AdminDashboard />} /> 
      </Routes>
    </AuthProvider>
  );
}