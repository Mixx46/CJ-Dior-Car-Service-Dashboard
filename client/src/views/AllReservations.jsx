import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, Pencil, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { api, exportCSV, fmtDateTime } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ReservationModal from '../components/ReservationModal';
import { useToast } from '../hooks/useToast';

const STATUSES = ['', 'Pending', 'Confirmed', 'En Route', 'Completed', 'Cancelled'];
const SOURCES  = ['', 'Manual', 'AI Phone Agent'];
const PAGE_SIZE = 25;

export default function AllReservations() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [page, setPage] = useState(1);
  const [editingRes, setEditingRes] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { addToast } = useToast();

  const fetchAll = async () => {
    try {
      const data = await api.get('/reservations');
      setAll(data);
    } catch {
      addToast('Failed to load reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    let rows = all;
    if (filterStatus) rows = rows.filter(r => r.status === filterStatus);
    if (filterSource) rows = rows.filter(r => r.source === filterSource);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.client_name  || '').toLowerCase().includes(q) ||
        (r.booking_id   || '').toLowerCase().includes(q) ||
        (r.client_phone || '').toLowerCase().includes(q) ||
        (r.client_email || '').toLowerCase().includes(q) ||
        (r.pickup_address  || '').toLowerCase().includes(q) ||
        (r.dropoff_address || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [all, search, filterStatus, filterSource]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterStatus, filterSource]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.patch(`/reservations/${id}`, { status });
      setAll(prev => prev.map(r => r.id === id ? updated : r));
      addToast('Status updated', 'success');
    } catch { addToast('Failed to update status', 'error'); }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Cancel reservation ${r.booking_id}? This cannot be undone.`)) return;
    try {
      await api.patch(`/reservations/${r.id}`, { status: 'Cancelled' });
      setAll(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Cancelled' } : x));
      addToast(`${r.booking_id} cancelled`, 'info');
    } catch { addToast('Failed to cancel reservation', 'error'); }
  };

  const handleSaved = (res) => {
    if (editingRes) {
      setAll(prev => prev.map(r => r.id === res.id ? res : r));
    } else {
      setAll(prev => [res, ...prev]);
    }
    setShowModal(false); setEditingRes(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">All Reservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(filtered, `cjdior-reservations-${new Date().toISOString().slice(0,10)}.csv`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => { setEditingRes(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm rounded-lg transition-colors">
            <Plus size={15} /> New Reservation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, booking ID, phone, address…"
            className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-600" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50">
            <option value="">All Statuses</option>
            {STATUSES.slice(1).map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50">
            <option value="">All Sources</option>
            {SOURCES.slice(1).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Head */}
        <div className="grid grid-cols-[140px_1fr_140px_1fr_120px_140px_80px] gap-3 px-4 py-2.5 border-b border-gray-800 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Booking</span>
          <span>Client</span>
          <span>Pickup Time</span>
          <span>Route</span>
          <span>Driver</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading ? <TableSkeleton rows={8} /> : paginated.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-base font-medium">No reservations found</p>
            {(search || filterStatus || filterSource) && (
              <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterSource(''); }}
                className="mt-2 text-sm text-brand-400 hover:text-brand-300">Clear filters</button>
            )}
          </div>
        ) : (
          paginated.map((r, i) => {
            const isAI = r.source === 'AI Phone Agent';
            return (
              <div key={r.id}
                className={`grid grid-cols-[140px_1fr_140px_1fr_120px_140px_80px] gap-3 px-4 py-3 items-center text-sm
                  ${i < paginated.length - 1 ? 'border-b border-gray-800' : ''}
                  ${isAI ? 'bg-amber-500/[0.04]' : ''}
                  hover:bg-gray-800/50 transition-colors`}
              >
                {/* Booking */}
                <div>
                  <div className="font-mono text-xs text-gray-400 flex items-center gap-1">
                    {r.booking_id}
                    {isAI && <span title="Vicky AI" className="text-sm leading-none">🤖</span>}
                  </div>
                </div>

                {/* Client */}
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{r.client_name}</div>
                  <div className="text-gray-500 text-xs truncate">{r.client_phone || r.client_email || '—'}</div>
                </div>

                {/* Pickup time */}
                <div className="text-gray-300 text-xs">{fmtDateTime(r.pickup_datetime)}</div>

                {/* Route */}
                <div className="min-w-0">
                  <div className="text-gray-300 text-xs truncate" title={r.pickup_address}>↑ {r.pickup_address}</div>
                  <div className="text-gray-500 text-xs truncate" title={r.dropoff_address}>↓ {r.dropoff_address}</div>
                </div>

                {/* Driver */}
                <div className="text-gray-400 text-xs truncate">{r.driver_assigned || <span className="text-rose-400">—</span>}</div>

                {/* Status */}
                <div>
                  <select
                    value={r.status}
                    onChange={e => handleStatusChange(r.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 w-full cursor-pointer focus:outline-none"
                  >
                    {['Pending','Confirmed','En Route','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingRes(r); setShowModal(true); }}
                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors" title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(r)}
                    className="p-1.5 rounded text-gray-600 hover:text-rose-400 hover:bg-rose-400/10 transition-colors" title="Cancel (soft delete)">
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <>
                  {i > 0 && arr[i-1] !== p - 1 && <span key={`gap-${p}`} className="text-gray-600 px-1">…</span>}
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-sm transition-colors ${p === page ? 'bg-brand-500 text-black font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    {p}
                  </button>
                </>
              ))
            }
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ReservationModal reservation={editingRes} onClose={() => { setShowModal(false); setEditingRes(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
