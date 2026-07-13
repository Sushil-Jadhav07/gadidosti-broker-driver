const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const request = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  return res.json();
};

// Multipart upload — no Content-Type set manually so the browser fills in the
// multipart boundary itself (setting it here would break the upload).
const uploadFile = async (path, formData, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  });
  return res.json();
};

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  put:    (path, body, token) => request('PUT',    path, body, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, body, token) => request('DELETE', path, body, token),
  upload: uploadFile,
};

export const getStoredAuth = () => {
  try {
    const b = localStorage.getItem('ssk_broker_auth');
    if (b) return { ...JSON.parse(b), role: 'broker' };
    const d = localStorage.getItem('ssk_driver_auth');
    if (d) return { ...JSON.parse(d), role: 'driver' };
    return null;
  } catch { return null; }
};

export const getToken = () => getStoredAuth()?.tokens?.access_token || null;
