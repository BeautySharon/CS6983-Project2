import { useRef, useState } from 'react';

export default function AcceptedTasks({ tasks, onFinish }) {
  const pending = useRef(new Set());
  const [busy, setBusy] = useState({});
  async function handleFinish(id) {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    setBusy(values => ({ ...values, [id]: true }));
    try { await onFinish(id); }
    finally { pending.current.delete(id); setBusy(values => ({ ...values, [id]: false })); }
  }
  if (!tasks.length) return <p className="text-sm text-slate-600">No accepted tasks yet.</p>;
  return <ul className="space-y-3">{tasks.map(task => <li key={task._id} className="min-w-0 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{task.petType} Care</h3><span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700 ring-1 ring-amber-200">Assigned</span></div>
    <p className="mt-2 text-sm text-slate-600">{new Date(task.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {task.duration} hours</p>
    <p className="mt-1 break-words text-sm text-slate-600">{task.location}</p>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{task.description}</p>
    <button onClick={() => handleFinish(task._id)} disabled={busy[task._id]} className="mt-3 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{busy[task._id] ? 'Finishing…' : 'Mark as Finished'}</button>
  </li>)}</ul>;
}
