import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SitterDashboard from '../pages/SitterDashboard';
import AvailableTasks from '../components/AvailableTasks';
import App from '../App';

const tasks = Array.from({ length: 4 }, (_, i) => ({ _id: `task-${i}`, petType: 'Dog', description: `Walk ${i}`, date: '2099-12-01T18:00:00Z', duration: 1.5, location: 'Boston', status: 'open', createdAt: `2026-10-${20 + i}T12:00:00Z` }));
const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
function dashboard() { render(<MemoryRouter initialEntries={['/sitter']}><SitterDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>); return userEvent.setup(); }
function server({ initial = tasks.slice(0, 1), applied = [], status = 201, failRefresh = false } = {}) {
  let submitted = false;
  fetch.mockImplementation(async (url, options) => {
    if (options.method === 'POST') { if (status < 400) { submitted = true; applied = [{ taskId: 'task-0' }]; } return reply(status < 400 ? { ok: true } : { error: 'Application rejected' }, status); }
    if (submitted && failRefresh) throw new TypeError('Offline');
    return reply(url.endsWith('/applications/mine') ? applied : initial);
  });
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
it('renders all three sections and the exact available empty state', async () => {
  server({ initial: [] }); dashboard();
  expect(await screen.findByText('No open tasks right now')).toBeInTheDocument();
  for (const name of ['Available Tasks', 'Accepted Tasks', 'Finished & Reviews']) expect(screen.getByRole('heading', { name })).toBeInTheDocument();
});
it('loads existing applications and disables their Apply action', async () => {
  server({ applied: [{ taskId: 'task-0' }] }); dashboard();
  expect(await screen.findByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
  expect(screen.getByLabelText('Message (optional)')).toBeDisabled();
});
it('submits only taskId and message with Bearer authentication, then refetches', async () => {
  localStorage.setItem('pawtrust.token', 'test-token'); server(); const ui = dashboard();
  await screen.findByText('Walk 0'); await ui.type(screen.getByLabelText('Message (optional)'), 'Happy to help');
  await ui.click(screen.getByRole('button', { name: 'Apply', exact: true }));
  expect(await screen.findByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
  const [url, options] = fetch.mock.calls.find(([, options]) => options.method === 'POST');
  expect(url).toMatch(/\/pawtrust\/applications\/apply$/); expect(JSON.parse(options.body)).toEqual({ taskId: 'task-0', message: 'Happy to help' });
  expect(options.headers.get('Authorization')).toBe('Bearer test-token'); expect(fetch).toHaveBeenCalledTimes(5);
});
it('accepts an empty optional message', async () => {
  server(); const ui = dashboard(); await screen.findByText('Walk 0'); await ui.click(screen.getByRole('button', { name: 'Apply', exact: true }));
  await screen.findByRole('button', { name: 'Applied', exact: true });
  expect(JSON.parse(fetch.mock.calls.find(([, options]) => options.method === 'POST')[1].body).message).toBe('');
});
it('prevents duplicate submissions while pending', async () => {
  const onApply = vi.fn(() => new Promise(() => {})); const ui = userEvent.setup();
  render(<AvailableTasks tasks={tasks.slice(0, 1)} appliedIds={[]} onApply={onApply} />);
  await ui.dblClick(screen.getByRole('button', { name: 'Apply', exact: true }));
  expect(onApply).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled();
});
it('rejects a message longer than 300 characters', async () => {
  const onApply = vi.fn(); const ui = userEvent.setup(); render(<AvailableTasks tasks={tasks.slice(0, 1)} appliedIds={[]} onApply={onApply} />);
  fireEvent.change(screen.getByLabelText('Message (optional)'), { target: { value: 'x'.repeat(301) } });
  await ui.click(screen.getByRole('button', { name: 'Apply', exact: true })); expect(screen.getByRole('alert')).toHaveTextContent('300'); expect(onApply).not.toHaveBeenCalled();
});
it.each([400, 403, 409])('retains the message and displays a %s error without claiming success', async status => {
  server({ status }); const ui = dashboard(); await screen.findByText('Walk 0'); await ui.type(screen.getByLabelText('Message (optional)'), 'Keep my note');
  await ui.click(screen.getByRole('button', { name: 'Apply', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Application rejected'); expect(screen.getByLabelText('Message (optional)')).toHaveValue('Keep my note');
  expect(screen.queryByRole('button', { name: 'Applied', exact: true })).not.toBeInTheDocument();
});
it('shows an unavailable state and retries without inventing tasks', async () => {
  fetch.mockRejectedValue(new TypeError('Offline')); const ui = dashboard();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect'); expect(screen.queryByText('No open tasks right now')).not.toBeInTheDocument();
  server({ initial: [] }); await ui.click(screen.getByRole('button', { name: 'Retry' })); expect(await screen.findByText('No open tasks right now')).toBeInTheDocument();
});
it('withholds Apply when application history fails to load', async () => {
  fetch.mockImplementation(async url => { if (url.endsWith('/applications/mine')) throw new TypeError('Offline'); return reply(tasks); });
  dashboard(); await screen.findByRole('alert'); expect(screen.queryByRole('button', { name: 'Apply', exact: true })).not.toBeInTheDocument();
});
it('preserves a server-confirmed Applied state if the follow-up refresh fails', async () => {
  server({ failRefresh: true }); const ui = dashboard(); await screen.findByText('Walk 0'); await ui.click(screen.getByRole('button', { name: 'Apply', exact: true }));
  expect(await screen.findByRole('button', { name: 'Applied', exact: true })).toBeDisabled(); expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');
});
it('filters closed tasks, paginates and retains a draft across pages', async () => {
  const ui = userEvent.setup(); render(<AvailableTasks tasks={[...tasks, { ...tasks[0], _id: 'closed', status: 'assigned', description: 'Hidden' }]} appliedIds={[]} onApply={vi.fn()} />);
  expect(screen.getAllByRole('article')).toHaveLength(3); expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  const card = screen.getAllByRole('article')[0]; await ui.type(within(card).getByLabelText('Message (optional)'), 'Draft note');
  await ui.click(screen.getByRole('button', { name: 'Next', exact: true })); expect(screen.getAllByRole('article')).toHaveLength(1);
  await ui.click(screen.getByRole('button', { name: 'Prev', exact: true })); expect(screen.getAllByLabelText('Message (optional)')[0]).toHaveValue('Draft note');
});
it('redirects an expired sitter session to login', async () => {
  localStorage.setItem('pawtrust.token', 'expired'); localStorage.setItem('pawtrust.user', JSON.stringify({ _id: 'sitter-1', name: 'Taylor', userType: 'sitter' }));
  fetch.mockResolvedValue(reply({ error: 'Unauthorized' }, 401));
  await act(async () => { render(<MemoryRouter initialEntries={['/sitter']}><App /></MemoryRouter>); });
  expect(await screen.findByRole('button', { name: 'Login', exact: true })).toBeInTheDocument(); expect(localStorage.length).toBe(0);
});
it('reconciles an already-applied conflict from server history', async () => {
  let conflict = false;
  fetch.mockImplementation(async (url, options) => {
    if (options.method === 'POST') { conflict = true; return reply({ error: 'Already applied' }, 409); }
    return reply(url.endsWith('/applications/mine') ? (conflict ? [{ taskId: 'task-0' }] : []) : tasks.slice(0, 1));
  });
  const ui = dashboard(); await screen.findByText('Walk 0'); await ui.click(screen.getByRole('button', { name: 'Apply', exact: true }));
  expect(await screen.findByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
});
it('accepts a message at the 300-character boundary', async () => {
  const onApply = vi.fn().mockResolvedValue(undefined); const ui = userEvent.setup(); render(<AvailableTasks tasks={tasks.slice(0, 1)} appliedIds={[]} onApply={onApply} />);
  fireEvent.change(screen.getByLabelText('Message (optional)'), { target: { value: 'x'.repeat(300) } });
  await ui.click(screen.getByRole('button', { name: 'Apply', exact: true })); expect(onApply).toHaveBeenCalledWith('task-0', 'x'.repeat(300));
});
it('rejects malformed application history instead of allowing duplicate applications', async () => {
  fetch.mockImplementation(async url => reply(url.endsWith('/applications/mine') ? [{ sitterId: 'wrong-shape' }] : tasks));
  dashboard(); expect(await screen.findByRole('alert')).toHaveTextContent('unreadable'); expect(screen.queryByRole('button', { name: 'Apply', exact: true })).not.toBeInTheDocument();
});
