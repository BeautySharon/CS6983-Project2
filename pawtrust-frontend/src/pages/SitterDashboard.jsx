import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import AvailableTasks from '../components/AvailableTasks';
import { apiFetch } from '../api/client';

const panel = 'min-w-0 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-4';
export default function SitterDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const confirmed = useRef(new Set());
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError('');
    try {
      const [available, applications] = await Promise.all([apiFetch('/tasks/available'), apiFetch('/applications/mine')]);
      if (!Array.isArray(available) || !available.every(task => task && typeof task._id === 'string' && typeof task.status === 'string') || !Array.isArray(applications) || !applications.every(application => application && typeof application.taskId === 'string')) {
        throw new Error('The service returned unreadable task or application data. Please try again.');
      }
      if (id !== request.current) return;
      setTasks(available); setAppliedIds([...new Set([...applications.map(application => application.taskId), ...confirmed.current])]); setReady(true);
    } catch (failure) { if (id === request.current) setError(failure.message); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { request.current += 1; }; }, [load]);
  async function apply(taskId, message) {
    try { await apiFetch('/applications/apply', { method: 'POST', body: JSON.stringify({ taskId, message }) }); }
    catch (failure) { await load(); throw failure; }
    confirmed.current.add(taskId);
    setAppliedIds(values => [...new Set([...values, taskId])]);
    await load();
  }
  return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white/80 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link to="/sitter" className="inline-flex items-center gap-2 rounded-md text-3xl font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <svg aria-hidden="true" viewBox="0 0 40 40" className="h-9 w-9 fill-current text-indigo-600"><ellipse cx="10" cy="14" rx="4" ry="6" transform="rotate(-25 10 14)"/><ellipse cx="19" cy="9" rx="4" ry="6"/><ellipse cx="29" cy="13" rx="4" ry="6" transform="rotate(25 29 13)"/><path d="M10 29c0-5 6-12 10-12s12 8 12 13c0 8-8 4-12 4s-10 3-10-5Z"/></svg>PawTrust
        </Link>
        <div className="flex items-center gap-4 text-sm"><span>Welcome, Sitter</span><button onClick={onLogout} className="rounded-md bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Logout</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold">Sitter Dashboard</h1>
      <p className="mt-1 text-slate-600">Welcome, {user.name}. Find a pet-care task and send your application.</p>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className={panel} aria-labelledby="available-heading" aria-busy={loading}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="available-heading" className="text-lg font-semibold">Available Tasks</h2>{ready && !error && <span className="text-sm text-slate-500">{tasks.filter(task => task.status === 'open').length} tasks</span>}</div>
          {loading && <p role="status" className="mb-4 text-sm text-slate-600">{ready ? 'Refreshing tasks…' : 'Loading tasks…'}</p>}
          {error && <div className="mb-4"><p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p><button onClick={load} disabled={loading} className="mt-3 rounded-md px-3 py-1 text-sm font-medium text-indigo-600 ring-1 ring-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60">Retry</button></div>}
          {ready && <AvailableTasks tasks={tasks} appliedIds={appliedIds} onApply={apply} disabled={loading || Boolean(error)} />}
        </section>
        <section className={panel} aria-labelledby="accepted-heading"><h2 id="accepted-heading" className="text-lg font-semibold">Accepted Tasks</h2><p className="mt-4 text-sm text-slate-600">Accepted task tracking is coming soon.</p></section>
        <section className={panel} aria-labelledby="finished-heading"><h2 id="finished-heading" className="text-lg font-semibold">Finished &amp; Reviews</h2><p className="mt-4 text-sm text-slate-600">Completed tasks and reviews are coming soon.</p></section>
      </div>
    </main>
  </div>;
}
