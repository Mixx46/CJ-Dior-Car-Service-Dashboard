const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function authHeader() {
  const token = localStorage.getItem('cj_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export const api = {
  get:   (path)        => request(path),
  post:  (path, body)  => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch: (path, body)  => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export function exportCSV(rows, filename = 'reservations.csv') {
  const headers = [
    'Booking ID', 'Client Name', 'Phone', 'Email',
    'Pickup Time', 'Pickup Address', 'Dropoff Address',
    'Driver', 'Vehicle', 'Passengers', 'Status', 'Source', 'Notes', 'Created',
  ];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvRows = rows.map(r => [
    r.booking_id, r.client_name, r.client_phone, r.client_email,
    r.pickup_datetime, r.pickup_address, r.dropoff_address,
    r.driver_assigned, r.vehicle_assigned, r.passenger_count,
    r.status, r.source, r.trip_notes, r.created_at,
  ].map(escape).join(','));

  const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function fmtDateTime(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d);
}

export function fmtTime(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

export function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

export function relativeTime(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
