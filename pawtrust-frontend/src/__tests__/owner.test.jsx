import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostTaskForm from '../components/PostTaskForm';
import TaskList from '../components/TaskList';
import OwnerDashboard from '../pages/OwnerDashboard';

const tasks = Array.from({ length: 4 }, (_, i) => ({ _id: `task-${i}`, petType: 'Dog', description: `Walk ${i}`, date: '2099-12-01T18:00:00Z', duration: 1.5, location: 'Boston', status: i === 1 ? 'assigned' : 'open', applicationCount: i, createdAt: `2026-10-${20 + i}T12:00:00Z` }));
function reply(body, status = 200) { return { ok: status < 400, status, json: async () => body }; }
async function fill(ui) {
  await ui.selectOptions(screen.getByLabelText('Pet Type'), 'Dog');
  await ui.type(screen.getByLabelText('Description'), 'Walk the dog');
  fireEvent.change(screen.getByLabelText('Date & Time'), { target: { value: '2099-12-01T10:00' } });
  await ui.type(screen.getByLabelText('Duration (hours)'), '1.5');
  await ui.type(screen.getByLabelText('Location'), 'Boston');
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
it('validates required fields, future dates and positive duration before submission', async () => {
  const onSubmit = vi.fn(); const ui = userEvent.setup(); render(<PostTaskForm onSubmit={onSubmit} onCreated={vi.fn()} />);
  await ui.click(screen.getByRole('button', { name: 'Post Task' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Complete all required fields');
  await fill(ui);
  fireEvent.change(screen.getByLabelText('Date & Time'), { target: { value: '2000-01-01T10:00' } });
  await ui.click(screen.getByRole('button', { name: 'Post Task' }));
  expect(screen.getByRole('alert')).toHaveTextContent('future');
  fireEvent.change(screen.getByLabelText('Date & Time'), { target: { value: '2099-12-01T10:00' } });
  fireEvent.change(screen.getByLabelText('Duration (hours)'), { target: { value: '0' } });
  await ui.click(screen.getByRole('button', { name: 'Post Task' }));
  expect(screen.getByRole('alert')).toHaveTextContent('greater than zero'); expect(onSubmit).not.toHaveBeenCalled();
});
it('submits normalized fields and calls onCreated only after success', async () => {
  const onSubmit = vi.fn().mockResolvedValue({ _id: 'new-task' }); const onCreated = vi.fn();
  const ui = userEvent.setup(); render(<PostTaskForm onSubmit={onSubmit} onCreated={onCreated} />); await fill(ui);
  await ui.click(screen.getByRole('button', { name: 'Post Task' }));
  expect(onSubmit).toHaveBeenCalledWith({ petType: 'Dog', description: 'Walk the dog', date: new Date('2099-12-01T10:00').toISOString(), duration: 1.5, location: 'Boston' });
  expect(onCreated).toHaveBeenCalledOnce(); expect(screen.getByRole('status')).toHaveTextContent('Task posted');
});
it('preserves fields on failure and prevents duplicate pending submissions', async () => {
  let reject; const onSubmit = vi.fn(() => new Promise((_, fail) => { reject = fail; })); const onCreated = vi.fn();
  const ui = userEvent.setup(); render(<PostTaskForm onSubmit={onSubmit} onCreated={onCreated} />); await fill(ui);
  await ui.dblClick(screen.getByRole('button', { name: 'Post Task' }));
  expect(onSubmit).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled();
  reject(new Error('Task could not be saved')); expect(await screen.findByRole('alert')).toHaveTextContent('Task could not be saved');
  expect(screen.getByLabelText('Description')).toHaveValue('Walk the dog'); expect(onCreated).not.toHaveBeenCalled();
});
it('sorts newest first and paginates three tasks at a time', async () => {
  const ui = userEvent.setup(); render(<TaskList tasks={tasks} onDelete={vi.fn()} />);
  expect(screen.getAllByRole('article')).toHaveLength(3); expect(screen.getAllByRole('article')[0]).toHaveTextContent('Walk 3');
  expect(screen.queryByText('Walk 0')).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
  expect(screen.getByText('Applications (3)')).toBeInTheDocument(); expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  await ui.click(screen.getByRole('button', { name: 'Next' })); expect(screen.getByText('Walk 0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});
it('only offers deletion for open tasks, asks for confirmation and retains errors', async () => {
  const onDelete = vi.fn().mockRejectedValue(new Error('Task is already assigned')); const ui = userEvent.setup();
  render(<TaskList tasks={tasks.slice(0, 2)} onDelete={onDelete} />);
  const assigned = screen.getAllByRole('article').find(node => node.textContent.includes('Walk 1'));
  expect(within(assigned).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  await ui.click(screen.getByRole('button', { name: 'Delete' })); expect(onDelete).not.toHaveBeenCalled();
  await ui.click(screen.getByRole('button', { name: 'Cancel' })); expect(onDelete).not.toHaveBeenCalled();
  await ui.click(screen.getByRole('button', { name: 'Delete' })); await ui.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(onDelete).toHaveBeenCalledWith('task-0'); expect(await screen.findByRole('alert')).toHaveTextContent('Task is already assigned');
});
it('clamps pagination when the final page becomes empty', async () => {
  const ui = userEvent.setup(); const view = render(<TaskList tasks={tasks} onDelete={vi.fn()} />);
  await ui.click(screen.getByRole('button', { name: 'Next' })); view.rerender(<TaskList tasks={tasks.slice(1)} onDelete={vi.fn()} />);
  expect(screen.getByText('Page 1 of 1')).toBeInTheDocument(); expect(screen.getAllByRole('article')).toHaveLength(3);
});
it('loads owner tasks with Bearer authentication and refetches after posting', async () => {
  localStorage.setItem('pawtrust.token', 'test-token');
  fetch.mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ _id: 'new-task' }, 201)).mockResolvedValueOnce(reply([tasks[0]])).mockResolvedValueOnce(reply([]));
  const ui = userEvent.setup(); render(<MemoryRouter initialEntries={['/owner']}><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  expect(await screen.findByText('No tasks yet. Post your first task.')).toBeInTheDocument(); await fill(ui);
  await ui.click(screen.getByRole('button', { name: 'Post Task' })); expect(await screen.findByText('Walk 0')).toBeInTheDocument();
  expect(fetch.mock.calls.map(([url]) => new URL(url, window.location.origin).pathname)).toEqual(['/pawtrust/tasks/mine', '/pawtrust/applications/owner', '/pawtrust/tasks', '/pawtrust/tasks/mine', '/pawtrust/applications/owner']);
  expect(fetch.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer test-token');
  expect(JSON.parse(fetch.mock.calls[2][1].body)).not.toHaveProperty('ownerId');
});
it('shows a load error and retries without fake tasks', async () => {
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(reply([])); const ui = userEvent.setup();
  render(<MemoryRouter initialEntries={['/owner']}><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect'); expect(screen.queryByRole('article')).not.toBeInTheDocument();
  await ui.click(screen.getByRole('button', { name: 'Retry' })); expect(await screen.findByText('No tasks yet. Post your first task.')).toBeInTheDocument();
});
it('deletes through the API and refetches the owner list', async () => {
  fetch.mockResolvedValueOnce(reply([tasks[0]])).mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply(null, 204)).mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply([]));
  const ui = userEvent.setup(); render(<MemoryRouter initialEntries={['/owner']}><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  await ui.click(await screen.findByRole('button', { name: 'Delete' })); await ui.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByText('No tasks yet. Post your first task.')).toBeInTheDocument();
  expect(fetch.mock.calls[2][0]).toMatch(/\/tasks\/task-0$/); expect(fetch.mock.calls[2][1].method).toBe('DELETE');
});
it.each([400, 403, 409])('shows a %s create error without clearing fields or reporting success', async (status) => {
  fetch.mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ error: 'Task rejected' }, status));
  const ui = userEvent.setup(); render(<MemoryRouter initialEntries={['/owner']}><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  await screen.findByText('No tasks yet. Post your first task.'); await fill(ui); await ui.click(screen.getByRole('button', { name: 'Post Task' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Task rejected'); expect(screen.getByLabelText('Description')).toHaveValue('Walk the dog');
  expect(screen.queryByText('Task posted.')).not.toBeInTheDocument(); expect(fetch).toHaveBeenCalledTimes(3);
});
it('rejects malformed task responses and does not invent application counts', async () => {
  fetch.mockResolvedValueOnce(reply({ tasks })).mockResolvedValueOnce(reply([]));
  const view = render(<MemoryRouter initialEntries={['/owner']}><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('unreadable task list'); view.unmount();
  render(<TaskList tasks={[{ ...tasks[0], applicationCount: undefined }]} onDelete={vi.fn()} />);
  expect(screen.getByText('Application count unavailable')).toBeInTheDocument();
});
it.each([200, 409])('refetches task and application states after acceptance returns %s', async (status) => {
  const applications = [
    { _id: 'a1', taskId: 'task-0', sitterName: 'Alex', message: 'Available', status: 'pending' },
    { _id: 'a2', taskId: 'task-0', sitterName: 'Sam', message: 'Nearby', status: 'pending' },
  ];
  fetch.mockResolvedValueOnce(reply([tasks[0]]))
    .mockResolvedValueOnce(reply(applications))
    .mockResolvedValueOnce(reply(status === 200 ? { status: 'assigned' } : { error: 'Task is already assigned' }, status))
    .mockResolvedValueOnce(reply([{ ...tasks[0], status: 'assigned' }]))
    .mockResolvedValueOnce(reply(applications.map((a, i) => ({ ...a, status: i === (status === 200 ? 0 : 1) ? 'accepted' : 'rejected' }))));
  const ui = userEvent.setup();
  render(<MemoryRouter><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  await ui.click(await screen.findByRole('button', { name: 'Applications (2)' }));
  await ui.click(screen.getByRole('button', { name: 'Accept Alex' }));
  await ui.click(screen.getByRole('button', { name: 'Confirm accept' }));
  await screen.findByText('assigned');
  const disclosure = screen.getByRole('button', { name: 'Applications (2)' });
  if (disclosure.getAttribute('aria-expanded') === 'false') await ui.click(disclosure);
  expect(screen.getByText('Accepted')).toBeVisible();
  expect(screen.getByText('Not selected')).toBeVisible();
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ taskId: 'task-0', applicationId: 'a1' });
  expect(fetch.mock.calls[2][1].method).toBe('POST');
  if (status === 409) expect(screen.getByRole('alert')).toHaveTextContent('Task is already assigned');
});
