import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import PostTaskForm from '../components/PostTaskForm';
import TaskList from '../components/TaskList';
import ReviewModal from '../components/ReviewModal';
import { apiFetch } from '../api/client';

export default function OwnerDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [applications, setApplications] = useState([]);
  const [acceptError, setAcceptError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [reviewing, setReviewing] = useState(null);
  const closeReview = useCallback(() => setReviewing(null), []);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError('');
    try {
      const [data, applicants] = await Promise.all([apiFetch('/tasks/mine'), apiFetch('/applications/owner')]);
      if (!Array.isArray(applicants)) throw new Error('The service returned an unreadable application list. Please try again.');
      if (!Array.isArray(data)) throw new Error('The service returned an unreadable task list. Please try again.');
      if (id === request.current) { setTasks(data); setApplications(applicants); }
    } catch (failure) { if (id === request.current) setError(failure.message); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { request.current += 1; }; }, [load]);
  async function created() { setRevision(value => value + 1); await load(); }
  async function remove(id) { await apiFetch(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }); await load(); }
  async function accept(taskId, applicationId) {
    setAcceptError('');
    try {
      await apiFetch('/accept', { method: 'POST', body: JSON.stringify({ taskId, applicationId }) });
    } catch (failure) {
      setAcceptError(failure.message);
      // Refetch after a conflict or uncertain response; never display local success.
      await load();
      return;
    }
    await load();
  }
  // The modal stays open with an error unless the server returns 2xx.
  async function submitReview({ rating, comment }) {
    await apiFetch('/reviews', { method: 'POST', body: JSON.stringify({ taskId: reviewing._id, rating, comment }) });
    setReviewing(null);
    await load();
  }
  return <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white/80 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link to="/owner" className="inline-flex items-center gap-2 rounded-md text-3xl font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"><svg aria-hidden="true" viewBox="0 0 40 40" className="h-9 w-9 fill-current text-indigo-600"><ellipse cx="10" cy="14" rx="4" ry="6" transform="rotate(-25 10 14)"/><ellipse cx="19" cy="9" rx="4" ry="6"/><ellipse cx="29" cy="13" rx="4" ry="6" transform="rotate(25 29 13)"/><path d="M10 29c0-5 6-12 10-12s12 8 12 13c0 8-8 4-12 4s-10 3-10-5Z"/></svg>PawTrust</Link>
        <div className="flex items-center gap-4 text-sm"><span>Welcome, Owner</span><button onClick={onLogout} className="rounded-md bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Logout</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
      <p className="mt-1 text-slate-600">Welcome, {user.name}. Post new tasks and manage your existing tasks.</p>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4"><PostTaskForm onSubmit={fields => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(fields) })} onCreated={created} /></div>
        <section aria-labelledby="my-tasks-heading" aria-busy={loading} className="min-w-0 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 id="my-tasks-heading" className="text-lg font-semibold">My Tasks</h2>{!loading && !error && <span className="text-sm text-slate-500">{tasks.length} tasks</span>}</div>
          {acceptError && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{acceptError}</p>}
          {loading ? <p role="status" className="py-8 text-sm text-slate-600">Loading tasks…</p> : error ? <div><p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p><button onClick={load} className="mt-3 rounded-md px-3 py-1 text-sm font-medium text-indigo-600 ring-1 ring-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">Retry</button></div> : <TaskList key={revision} tasks={tasks} onDelete={remove} applications={applications} onAccept={accept} onReview={setReviewing} />}
        </section>
      </div>
    </main>
    {reviewing && <ReviewModal task={reviewing} onSubmit={submitReview} onClose={closeReview} />}
  </div>;
}
