import { BASE_URL } from '../config';
import { clearSession } from '../auth/session';

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('pawtrust.token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response;
  try {
    response = await fetch(`${BASE_URL}/pawtrust${path}`, { ...options, headers });
  } catch {
    throw new Error('Unable to connect. Please try again when the service is available.');
  }
  if (response.status === 401) {
    clearSession();
    // Notify the router without reloading and losing inline login errors.
    window.dispatchEvent(new Event('pawtrust:unauthorized'));
  }
  let data;
  try { data = await response.json(); }
  catch {
    if (response.status === 204) return null;
    throw new Error('The service returned an unreadable response. Please try again.');
  }
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Request failed (${response.status}).`);
  return data;
}
