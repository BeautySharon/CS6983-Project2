import OwnerApplications from './OwnerApplications';
import { useRef, useState } from 'react';

const action = 'rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';
const colors = { open: 'bg-sky-50 text-sky-700 ring-sky-200', assigned: 'bg-amber-50 text-amber-700 ring-amber-200', finished: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
function TaskCard({ task, onDelete, applications, onAccept }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef(null);
  const busy = useRef(false);
  async function remove() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { await onDelete(task._id); setConfirming(false); }
    catch (failure) { setError(failure.message); }
    finally { busy.current = false; setPending(false); }
  }
  const date = new Date(task.date);
  return <article className="min-w-0 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{task.petType} Care</h3>
        <p className="mt-1 break-words text-sm text-slate-600">{Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {task.duration} hours · {task.location}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs capitalize ring-1 ${colors[task.status] || 'bg-slate-50 text-slate-600 ring-slate-200'}`}>{task.status}</span>
      {task.status === 'open' && !confirming && <button ref={trigger} onClick={() => setConfirming(true)} className={`${action} text-rose-700 ring-1 ring-rose-300 hover:bg-rose-50`}>Delete</button>}
    </div>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{task.description}</p>
    {onAccept ? <OwnerApplications task={task} applications={applications} onAccept={onAccept} /> : <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{Number.isInteger(task.applicationCount) && task.applicationCount >= 0 ? `Applications (${task.applicationCount})` : 'Application count unavailable'}</p>}
    {confirming && <div role="group" aria-label="Confirm task deletion" className="mt-3 rounded-lg bg-rose-50 p-3">
      <p className="mb-2 text-sm text-rose-800">Delete this task? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <button autoFocus disabled={pending} onClick={() => { setConfirming(false); setError(''); requestAnimationFrame(() => trigger.current?.focus()); }} className={`${action} bg-white text-slate-700 ring-1 ring-slate-300`}>Cancel</button>
        <button disabled={pending} onClick={remove} className={`${action} bg-rose-700 text-white hover:bg-rose-800`}>{pending ? 'Deleting…' : 'Confirm delete'}</button>
      </div>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
  </article>;
}
export default function TaskList({ tasks, onDelete, applications = [], onAccept }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(tasks.length / 3));
  const current = Math.min(page, pages);
  const sorted = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return <>
    {tasks.length === 0 ? <p className="py-8 text-sm text-slate-600">No tasks yet. Post your first task.</p> : <div className="space-y-4">{sorted.slice((current - 1) * 3, current * 3).map(task => <TaskCard key={task._id} task={task} onDelete={onDelete} applications={applications.filter(a => a.taskId === task._id)} onAccept={onAccept} />)}</div>}
    <nav aria-label="Task pagination" className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm">
      <button className={`${action} ring-1 ring-slate-300`} disabled={current === 1} onClick={() => setPage(current - 1)}>Prev</button>
      <span>Page {current} of {pages}</span>
      <button className={`${action} ring-1 ring-slate-300`} disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button>
    </nav>
  </>;
}
