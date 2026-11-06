import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SitterDashboard from '../pages/SitterDashboard';
const task = { _id: 'task-1', petType: 'Dog', description: 'Walk Max', location: 'Seattle', date: '2099-11-10T18:00:00Z', duration: 1, status: 'assigned' };
const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
function renderPage() { render(<MemoryRouter><SitterDashboard user={{ name: 'Alex' }} onLogout={vi.fn()} /></MemoryRouter>); return userEvent.setup(); }
function server(post) {
  let done = false;
  fetch.mockImplementation(async (url, options) => {
    if (options.method === 'POST') { if (post) return post(); done = true; return reply({ ...task, status: 'finished' }); }
    if (url.endsWith('/tasks/accepted')) return reply(done ? [] : [task]);
    if (url.endsWith('/tasks/finished')) return reply(done ? [{ ...task, status: 'finished', review: null }] : []);
    return reply([]);
  });
}
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
it('moves a completed task into Finished & Reviews without a reload', async () => {
  server(); const ui = renderPage();
  await ui.click(await screen.findByRole('button', { name: 'Mark as Finished' }));
  expect(await within(screen.getByRole('region', { name: 'Finished & Reviews' })).findByText('Dog Care')).toBeInTheDocument();
  expect(screen.getByText('No accepted tasks yet.')).toBeInTheDocument();
  expect(fetch.mock.calls.find(([, options]) => options.method === 'POST')[0]).toMatch(/tasks\/task-1\/finish$/);
});
it('disables the button immediately and prevents duplicate submissions', async () => {
  const post = vi.fn(() => new Promise(() => {})); server(post); const ui = renderPage();
  await ui.dblClick(await screen.findByRole('button', { name: 'Mark as Finished' }));
  expect(post).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Finishing…' })).toBeDisabled();
});
it('keeps the task and shows a server error when completion fails', async () => {
  server(() => reply({ error: 'Could not finish task' }, 500)); const ui = renderPage();
  await ui.click(await screen.findByRole('button', { name: 'Mark as Finished' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not finish task');
  expect(screen.getByRole('button', { name: 'Mark as Finished' })).toBeEnabled();
  expect(screen.getByText('Walk Max')).toBeInTheDocument();
});
it('refreshes both columns after a concurrent completion returns 409', async () => {
  let done = false;
  fetch.mockImplementation(async (url, options) => {
    if (options.method === 'POST') { done = true; return reply({ error: 'Task is no longer assigned' }, 409); }
    if (url.endsWith('/tasks/accepted')) return reply(done ? [] : [task]);
    if (url.endsWith('/tasks/finished')) return reply(done ? [{ ...task, status: 'finished', review: null }] : []);
    return reply([]);
  });
  const ui = renderPage(); await ui.click(await screen.findByRole('button', { name: 'Mark as Finished' }));
  expect(await screen.findByText('No accepted tasks yet.')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Task is no longer assigned');
  expect(within(screen.getByRole('region', { name: 'Finished & Reviews' })).getByText('Dog Care')).toBeInTheDocument();
});
it('shows a retry when the accepted list cannot load', async () => {
  let offline = true;
  fetch.mockImplementation(async url => {
    if (url.endsWith('/tasks/accepted') && offline) throw new Error('Offline');
    return reply([]);
  });
  const ui = renderPage(); const accepted = within(screen.getByRole('region', { name: 'Accepted Tasks' }));
  expect(await accepted.findByRole('alert')).toHaveTextContent('Unable to connect');
  offline = false; await ui.click(accepted.getByRole('button', { name: 'Retry' }));
  expect(await accepted.findByText('No accepted tasks yet.')).toBeInTheDocument();
});
