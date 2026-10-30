import { useRef, useState } from 'react';
import { inputClass, buttonClass } from './AuthLayout';

export default function AuthForm({ register = false, onSubmit }) {
  const [values, setValues] = useState({ name: '', email: '', password: '', userType: 'owner', location: '', bio: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const busy = useRef(false);
  function handleChange(event) { setValues({ ...values, [event.target.name]: event.target.value }); }
  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current) return;
    setError('');
    if (!values.email.trim() || !values.password || (register && (!values.name.trim() || !values.location.trim()))) {
      setError(register ? 'Complete all required fields.' : 'Enter your email and password.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) { setError('Enter a valid email address.'); return; }
    if (register && values.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    busy.current = true; setPending(true);
    try { await onSubmit({ ...values, name: values.name.trim(), email: values.email.trim(), location: values.location.trim(), bio: values.bio.trim() }); }
    catch (failure) { setError(failure.message); }
    finally { busy.current = false; setPending(false); }
  }
  function field(label, name, type = 'text', autoComplete) {
    return <div><label htmlFor={name} className="text-sm font-medium text-slate-700">{label}</label>
      <input id={name} name={name} type={type} autoComplete={autoComplete} required value={values[name]} onChange={handleChange} className={inputClass} /></div>;
  }
  return <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={pending}>
    {register && field('Name', 'name', 'text', 'name')}
    {field('Email', 'email', 'email', 'email')}
    <div><label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
      <div className="relative"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required value={values.password} onChange={handleChange} className={`${inputClass} pr-20`} aria-describedby={register ? 'password-hint' : undefined} />
        <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-3 top-3.5 rounded text-sm font-medium text-indigo-700 focus:ring-2 focus:ring-indigo-500">{visible ? 'Hide' : 'Show'}</button></div>
      {register && <p id="password-hint" className="mt-1 text-xs text-slate-600">Use at least 8 characters.</p>}
    </div>
    {register && <>
      <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">I am a</legend>
        <div className="flex flex-wrap gap-5">{[['owner', 'Pet Owner'], ['sitter', 'Pet Sitter']].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name="userType" value={value} checked={values.userType === value} onChange={handleChange} className="accent-indigo-600 focus:ring-2 focus:ring-indigo-500" />{label}</label>)}</div>
      </fieldset>
      {field('Location', 'location', 'text', 'address-level2')}
      <div><label htmlFor="bio" className="text-sm font-medium text-slate-700">Bio (optional)</label><textarea id="bio" name="bio" rows={3} value={values.bio} onChange={handleChange} className={inputClass} /></div>
    </>}
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm leading-5 text-rose-800">{error}</p>}
    <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>{pending ? (register ? 'Creating account…' : 'Logging in…') : (register ? 'Create Account' : 'Login')}</button>
  </form>;
}
