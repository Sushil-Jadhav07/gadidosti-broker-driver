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

// Fetches a file (e.g. the driver's payment QR) with the auth header attached and returns
// a local blob URL — needed because the file-serving routes require a Bearer token, so a
// plain <img src="..."> can't load them directly.
const getFileBlobUrl = async (url, token) => {
  const res = await fetch(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
  if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

// Same as getFileBlobUrl but returns the raw Blob — needed to build a File for the native
// Web Share API (sharing to WhatsApp etc. with the actual PDF attached), where an object URL
// string isn't usable.
const getFileBlob = async (url, token) => {
  const res = await fetch(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
  if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
  return res.blob();
};

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  put:    (path, body, token) => request('PUT',    path, body, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, body, token) => request('DELETE', path, body, token),
  upload: uploadFile,
  getFileBlobUrl,
  getFileBlob,
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
