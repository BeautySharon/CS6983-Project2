export function clearSession() {
  localStorage.removeItem('pawtrust.token');
  localStorage.removeItem('pawtrust.user');
}
export function readSession() {
  try {
    const token = localStorage.getItem('pawtrust.token');
    const user = JSON.parse(localStorage.getItem('pawtrust.user'));
    if (token && user?._id && ['owner', 'sitter'].includes(user.userType)) return user;
  } catch { /* Corrupt browser storage is treated as a signed-out session. */ }
  return null;
}
export function saveSession({ token, user }) {
  if (typeof token !== 'string' || !token || !user?._id || !['owner', 'sitter'].includes(user.userType)) {
    throw new Error('The server returned an invalid login response. Please try again.');
  }
  const safeUser = { _id: user._id, name: user.name, userType: user.userType };
  localStorage.setItem('pawtrust.token', token);
  localStorage.setItem('pawtrust.user', JSON.stringify(safeUser));
  return safeUser;
}
