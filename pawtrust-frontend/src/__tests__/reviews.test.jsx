import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TaskList from '../components/TaskList';
import ReviewModal from '../components/ReviewModal';
import FinishedReviews from '../components/FinishedReviews';
import OwnerDashboard from '../pages/OwnerDashboard';
import SitterDashboard from '../pages/SitterDashboard';

const base = { petType: 'Dog', description: 'Walk Max', date: '2099-01-01T12:00:00Z', duration: 1, location: 'Seattle', createdAt: '2026-11-01T12:00:00Z', applicationCount: 1 };
const finished = { ...base, _id: 'task-1', status: 'finished', acceptedSitterId: 'sitter-1', reviewed: false };
const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

it('shows Review only on finished, unreviewed tasks and Reviewed once reviewed', () => {
  render(<TaskList onDelete={vi.fn()} onReview={vi.fn()} tasks={[
    finished,
    { ...finished, _id: 'task-2', reviewed: true, createdAt: '2026-10-31T12:00:00Z' },
    { ...base, _id: 'task-3', status: 'assigned', acceptedSitterId: 'sitter-1', createdAt: '2026-10-30T12:00:00Z' },
  ]} />);
  const [first, second, third] = screen.getAllByRole('article');
  expect(within(first).getByRole('button', { name: 'Review' })).toBeInTheDocument();
  expect(within(second).getByText('Reviewed')).toBeInTheDocument();
  expect(within(second).queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
  expect(within(third).queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
});

it('selects a rating with the keyboard and submits rating and comment', async () => {
  const onSubmit = vi.fn().mockResolvedValue(); const ui = userEvent.setup();
  render(<ReviewModal task={finished} onSubmit={onSubmit} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog', { name: 'Review your sitter' })).toBeInTheDocument();
  const one = screen.getByRole('radio', { name: '1 of 5 stars' });
  expect(one).toHaveFocus();
  await ui.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
  expect(screen.getByRole('radio', { name: '4 of 5 stars' })).toBeChecked();
  await ui.type(screen.getByLabelText('Comment (optional)'), '  Great sitter  ');
  await ui.click(screen.getByRole('button', { name: 'Submit review' }));
  expect(onSubmit).toHaveBeenCalledWith({ rating: 4, comment: 'Great sitter' });
});

it('requires a rating, limits the comment, and closes with Escape', async () => {
  const onSubmit = vi.fn(); const onClose = vi.fn(); const ui = userEvent.setup();
  render(<ReviewModal task={finished} onSubmit={onSubmit} onClose={onClose} />);
  expect(screen.getByLabelText('Comment (optional)')).toHaveAttribute('maxLength', '500');
  await ui.click(screen.getByRole('button', { name: 'Submit review' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please choose a rating');
  expect(onSubmit).not.toHaveBeenCalled();
  await ui.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});

it('keeps the modal open and shows the server error on failure', async () => {
  const onSubmit = vi.fn().mockRejectedValue(new Error('This task has already been reviewed')); const ui = userEvent.setup();
  render(<ReviewModal task={finished} onSubmit={onSubmit} onClose={vi.fn()} />);
  await ui.click(screen.getByRole('radio', { name: '5 of 5 stars' }));
  await ui.click(screen.getByRole('button', { name: 'Submit review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already been reviewed');
  expect(screen.getByRole('button', { name: 'Submit review' })).toBeEnabled();
});

it('posts the review from the owner dashboard and refetches to show Reviewed', async () => {
  localStorage.setItem('pawtrust.token', 'test-token');
  fetch.mockResolvedValueOnce(reply([finished]))
    .mockResolvedValueOnce(reply({ _id: 'review-1' }, 201))
    .mockResolvedValueOnce(reply([{ ...finished, reviewed: true }]));
  const ui = userEvent.setup();
  render(<MemoryRouter><OwnerDashboard user={{ name: 'Taylor' }} onLogout={vi.fn()} /></MemoryRouter>);
  await ui.click(await screen.findByRole('button', { name: 'Review' }));
  await ui.click(screen.getByRole('radio', { name: '3 of 5 stars' }));
  await ui.click(screen.getByRole('button', { name: 'Submit review' }));
  expect(await screen.findByText('Reviewed')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const [url, options] = fetch.mock.calls[1];
  expect(url).toMatch(/\/pawtrust\/reviews$/);
  expect(JSON.parse(options.body)).toEqual({ taskId: 'task-1', rating: 3, comment: '' });
  expect(options.headers.get('Authorization')).toBe('Bearer test-token');
});

it('shows stars with an accessible label, the average, and "No review yet"', () => {
  render(<FinishedReviews tasks={[
    { ...finished, review: { rating: 4, comment: 'Lovely' } },
    { ...finished, _id: 'task-2', review: { rating: 5, comment: '' } },
    { ...finished, _id: 'task-3', review: null },
  ]} />);
  expect(screen.getByText('Average rating 4.5')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '4 of 5 stars' })).toBeInTheDocument();
  expect(screen.getByText('Lovely')).toBeInTheDocument();
  expect(screen.getByText('No review yet')).toBeInTheDocument();
  expect(screen.getByText('(2 reviews)')).toBeInTheDocument();
});

it('shows an empty state when the sitter has no finished tasks', () => {
  render(<FinishedReviews tasks={[]} />);
  expect(screen.getByText('No finished tasks yet.')).toBeInTheDocument();
});

it('loads finished tasks on the sitter dashboard', async () => {
  fetch.mockImplementation(async url => reply(url.endsWith('/tasks/finished') ? [{ ...finished, review: { rating: 2, comment: 'Late' } }] : []));
  render(<MemoryRouter><SitterDashboard user={{ name: 'Sam' }} onLogout={vi.fn()} /></MemoryRouter>);
  const section = within(screen.getByRole('region', { name: 'Finished & Reviews' }));
  expect(await section.findByText('Late')).toBeInTheDocument();
  // Once for the average, once for the task.
  expect(section.getAllByRole('img', { name: '2 of 5 stars' })).toHaveLength(2);
});

it('shows a finished-task load error without fake data', async () => {
  fetch.mockImplementation(async url => { if (url.endsWith('/tasks/finished')) throw new TypeError('Offline'); return reply([]); });
  render(<MemoryRouter><SitterDashboard user={{ name: 'Sam' }} onLogout={vi.fn()} /></MemoryRouter>);
  const section = within(screen.getByRole('region', { name: 'Finished & Reviews' }));
  expect(await section.findByRole('alert')).toHaveTextContent('Unable to connect');
  expect(section.queryByText('No finished tasks yet.')).not.toBeInTheDocument();
});
