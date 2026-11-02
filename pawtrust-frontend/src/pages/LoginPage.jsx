import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout, { linkClass } from '../components/AuthLayout';
import AuthForm from '../components/AuthForm';
import { apiFetch } from '../api/client';
import { saveSession } from '../auth/session';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  async function handleLogin({ email, password }) {
    const result = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    const user = saveSession(result);
    navigate(`/${user.userType}`, { replace: true });
  }
  return <AuthLayout><h1 className="text-2xl font-semibold text-slate-900">Login</h1>
    <p className="mt-2 text-sm text-slate-600">Welcome back! Please sign in to continue.</p>
    {location.state?.registered && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Account created. Log in to get started.</p>}
    <AuthForm onSubmit={handleLogin} />
    <p className="mt-4 text-center text-sm text-slate-600">Don't have an account? <Link to="/register" className={linkClass}>Register here</Link></p>
  </AuthLayout>;
}
