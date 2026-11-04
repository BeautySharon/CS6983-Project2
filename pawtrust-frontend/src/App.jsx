import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import OwnerDashboard from './pages/OwnerDashboard';
import RegisterPage from './pages/RegisterPage';
import AuthLayout, { buttonClass } from './components/AuthLayout';
import { clearSession, readSession } from './auth/session';

function ProtectedRoute({ role }) {
  const user = readSession();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/" replace />;
  if (user.userType !== role) return <Navigate to={`/${user.userType}`} replace />;
  function handleLogout() { clearSession(); navigate('/', { replace: true }); }
  if (role === 'owner') return <OwnerDashboard user={user} onLogout={handleLogout} />;
  return <AuthLayout><h1 className="text-2xl font-bold text-slate-900">{role === 'owner' ? 'Owner Dashboard' : 'Sitter Dashboard'}</h1>
    <p className="mt-4 text-slate-600">Welcome, {user.name}.</p>
    <p className="my-4 text-sm text-slate-600">Your dashboard is under construction.</p>
    <button className={buttonClass} onClick={handleLogout}>Logout</button></AuthLayout>;
}
export default function App() {
  const navigate = useNavigate();
  useEffect(() => {
    function handleUnauthorized() { navigate('/', { replace: true }); }
    window.addEventListener('pawtrust:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('pawtrust:unauthorized', handleUnauthorized);
  }, [navigate]);
  return <Routes><Route path="/" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} />
    <Route path="/owner" element={<ProtectedRoute role="owner" />} /><Route path="/sitter" element={<ProtectedRoute role="sitter" />} />
    <Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
