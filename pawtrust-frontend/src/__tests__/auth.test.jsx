import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { apiFetch } from '../api/client';

const user = { _id: 'user-1', name: 'Taylor', userType: 'owner' };
function open(path = '/') { render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); return userEvent.setup(); }
function reply(body, status = 200) { fetch.mockResolvedValue({ ok: status < 400, status, json: async () => body }); }
async function credentials(ui) {
  await ui.type(screen.getByLabelText('Email'), 'taylor@example.com');
  await ui.type(screen.getByLabelText('Password', { exact: true }), 'test-password');
}
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

describe('authentication pages', () => {
  it('validates empty login without contacting the server', async () => {
    const ui = open(); await ui.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email and password'); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['owner', 'sitter'])('stores a safe session and redirects %s', async (role) => {
    reply({ token: 'test-token', user: { ...user, userType: role, passwordHash: 'must-not-store' } });
    const ui = open(); await credentials(ui); await ui.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('heading', { name: role === 'owner' ? 'Owner Dashboard' : 'Sitter Dashboard' })).toBeInTheDocument();
    expect(localStorage.getItem('pawtrust.token')).toBe('test-token');
    expect(JSON.parse(localStorage.getItem('pawtrust.user'))).toEqual(user.userType === role ? user : { ...user, userType: role });
    await ui.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument(); expect(localStorage.length).toBe(0);
  });
  it('shows bad credentials inline instead of success', async () => {
    reply({ error: 'Invalid email or password' }, 401); const ui = open(); await credentials(ui);
    await ui.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password'); expect(localStorage.length).toBe(0);
  });
  it('shows connection failure and preserves input', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch')); const ui = open(); await credentials(ui);
    await ui.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');
    expect(screen.getByLabelText('Email')).toHaveValue('taylor@example.com'); expect(localStorage.length).toBe(0);
  });
  it.each(['/owner', '/sitter'])('protects %s when logged out', (path) => {
    open(path); expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
  it('handles corrupt stored user data', () => {
    localStorage.setItem('pawtrust.token', 'token'); localStorage.setItem('pawtrust.user', '{broken');
    open('/owner'); expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
  it('validates registration then sends the agreed fields and redirects to login', async () => {
    reply({ message: 'Created' }); const ui = open('/register');
    await ui.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Complete all required fields'); expect(fetch).not.toHaveBeenCalled();
    await ui.type(screen.getByLabelText('Name'), 'Taylor'); await credentials(ui);
    await ui.click(screen.getByLabelText('Pet Sitter')); await ui.type(screen.getByLabelText('Location'), 'Boston');
    await ui.type(screen.getByLabelText('Bio (optional)'), 'I enjoy caring for pets.');
    await ui.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Account created');
    const [url, options] = fetch.mock.calls[0]; expect(url).toMatch(/\/pawtrust\/register$/);
    expect(JSON.parse(options.body)).toEqual({ name: 'Taylor', email: 'taylor@example.com', password: 'test-password', userType: 'sitter', location: 'Boston', bio: 'I enjoy caring for pets.' });
    expect(localStorage.length).toBe(0);
  });
  it('prevents duplicate submissions while login is pending', async () => {
    fetch.mockReturnValue(new Promise(() => {})); const ui = open(); await credentials(ui);
    await ui.dblClick(screen.getByRole('button', { name: 'Login' }));
    expect(fetch).toHaveBeenCalledTimes(1); expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
  });
  it('restores a session and redirects an incorrect role route', () => {
    localStorage.setItem('pawtrust.token', 'token'); localStorage.setItem('pawtrust.user', JSON.stringify(user));
    open('/sitter'); expect(screen.getByRole('heading', { name: 'Owner Dashboard' })).toBeInTheDocument();
  });
  it('redirects to login when a protected request receives 401', async () => {
    localStorage.setItem('pawtrust.token', 'expired'); localStorage.setItem('pawtrust.user', JSON.stringify(user));
    open('/owner'); reply({ error: 'Unauthorized' }, 401);
    await act(async () => { await expect(apiFetch('/tasks')).rejects.toThrow('Unauthorized'); });
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
  it('rejects malformed successful login responses', async () => {
    reply({ token: 'token', user: { ...user, userType: 'admin' } }); const ui = open(); await credentials(ui);
    await ui.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid login response'); expect(localStorage.length).toBe(0);
  });
  it('validates registration email and password length', async () => {
    const ui = open('/register'); await ui.type(screen.getByLabelText('Name'), 'Taylor');
    await ui.type(screen.getByLabelText('Location'), 'Boston'); await ui.type(screen.getByLabelText('Email'), 'invalid');
    await ui.type(screen.getByLabelText('Password', { exact: true }), 'short');
    await ui.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid email');
    await ui.clear(screen.getByLabelText('Email')); await ui.type(screen.getByLabelText('Email'), 'taylor@example.com');
    await ui.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('at least 8'); expect(fetch).not.toHaveBeenCalled();
  });
  it('retains registration values after duplicate email rejection', async () => {
    reply({ error: 'Email already registered' }, 409); const ui = open('/register');
    await ui.type(screen.getByLabelText('Name'), 'Taylor'); await credentials(ui); await ui.type(screen.getByLabelText('Location'), 'Boston');
    await ui.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    expect(screen.getByLabelText('Name')).toHaveValue('Taylor'); expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('toggles password visibility without submitting', async () => {
    const ui = open(); await ui.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('type', 'text');
    await ui.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('type', 'password'); expect(fetch).not.toHaveBeenCalled();
  });
});

describe('API transport', () => {
  it('attaches the session token and parses JSON', async () => {
    localStorage.setItem('pawtrust.token', 'test-token'); reply({ tasks: [] });
    expect(await apiFetch('/tasks')).toEqual({ tasks: [] });
    expect(new Headers(fetch.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer test-token');
  });
  it.each([400, 403, 409])('preserves a server error for status %s', async (status) => {
    reply({ error: 'Request rejected' }, status); await expect(apiFetch('/register')).rejects.toThrow('Request rejected');
  });
  it('clears both session keys after a 401', async () => {
    localStorage.setItem('pawtrust.token', 'expired'); localStorage.setItem('pawtrust.user', JSON.stringify(user));
    reply({ error: 'Unauthorized' }, 401); await expect(apiFetch('/tasks')).rejects.toThrow('Unauthorized');
    await waitFor(() => expect(localStorage.length).toBe(0));
  });
});
