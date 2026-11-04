import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { linkClass } from '../components/AuthLayout';
import AuthForm from '../components/AuthForm';
import { apiFetch } from '../api/client';

export default function RegisterPage() {
  const navigate = useNavigate();
  async function handleRegister(values) {
    await apiFetch('/register', { method: 'POST', body: JSON.stringify(values) });
    navigate('/', { replace: true, state: { registered: true } });
  }
  return <AuthLayout><h1 className="text-2xl font-semibold text-slate-900">Create an Account</h1>
    <p className="mt-2 text-sm text-slate-600">Join PawTrust as a pet owner or pet sitter.</p>
    <AuthForm register onSubmit={handleRegister} />
    <p className="mt-4 text-center text-sm text-slate-600">Already have an account? <Link to="/" className={linkClass}>Login here</Link></p>
  </AuthLayout>;
}
