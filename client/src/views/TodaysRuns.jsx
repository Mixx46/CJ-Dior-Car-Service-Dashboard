import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, MapPin, Phone, User, Car, Pencil, Plane, Luggage } from 'lucide-react';
import { api, fmtTime, relativeTime } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ReservationModal from '../components/ReservationModal';
import DriverCombobox from '../components/DriverCombobox';
import { useToast } from '../hooks/useToast';

const STATUSES = ['Pending', 'Confirmed', 'En Route', 'Completed', 'Cancelled'];

function ReservationCard({ r, drivers, onStatusChange, onDriverChange, onEdit }) {
  const isAI = r.source === 'AI Phone Agent';

  return (
    <div className={`rounded-xl border p-5 transition-colors ${
      isAI ? 'bg-amber-500/5 border-amber-500/20' : 'bg-gray-900 border-gray-800'
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-gray-500">{r.booking_id}</span>
          {isAI && <span title="Created by Vicky AI" className="text-base leading-none">🤖</span>}
          <StatusBadge status={r.status} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={r.status}
            onChange={e => onStatusChange(r.id, e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Client */}
      <div className="flex items-center gap-2 mb-2">
        <User size={14} className="text-gray-500 shrink-0" />
        <span className="text-white font-semibold text-sm">{r.client_name}</span>
        {r.client_phone && (
          <>
            <span className="text-gray-700">·</span>
            <Phone size={12} className="text-gray-500" />
            <span className="text-gray-400 text-sm">{r.client_phone}</span>
          </>
        )}
      </div>

      {/* Time & route */}
      <div className="flex items-start gap-2 mb-1">
        <MapPin size={14} className="text-brand-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="text-brand-400 font-semibold">{fmtTime(r.pickup_datetime)}</span>
          <span className="text-gray-400 mx-2">→</span>
          <span className="text-gray-300">{r.pickup_address}</span>
        </div>
      </div>
      <div className="flex items-start gap-2 mb-3 pl-5">
        <span className="text-xs text-gray-500">→</span>
        <span className="text-sm text-gray-400">{r.dropoff_address}</span>
      </div>

      {/* Driver & vehicle */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <DriverCombobox
          value={r.driver_assigned || ''}
          drivers={drivers}
          onChange={name => onDriverChange(r.id, name)}
        />
        <span className="flex items-center gap-1">
          <Car size={11} />
          {r.vehicle_assigned || '—'}
        </span>
        <span>{r.passenger_count} pax</span>
        {r.luggage_count > 0 && (
          <span className="flex items-center gap-1">
            <Luggage size={11} />{r.luggage_count}
          </span>
        )}
        {r.flight_number && (
          <span className={`flex items-center gap-1 font-mono ${
            r.flight_data?.status === 'landed'   ? 'text-green-400/80' :
            r.flight_data?.status === 'active'   ? 'text-blue-400/80'  :
            r.flight_data?.status === 'cancelled'? 'text-rose-400/80'  : 'text-gray-400'
          }`}>
            <Plane size={11} />{r.flight_number}
            {r.flight_data?.status && <span className="text-[10px] capitalize">({r.flight_data.status})</span>}
          </span>
        )}
        {r.trip_notes && <span className="text-amber-400/70 truncate max-w-[200px]" title={r.trip_notes}>📝 {r.trip_notes}</span>}
      </div>
    </div>
  );
}

const STAT_KEYS = ['Pending', 'Confirmed', 'En Route', 'Completed', 'Cancelled'];

export default function TodaysRuns() {
  const [reservations, setReservations] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [tick, setTick] = useState(0);
  const [editingRes, setEditingRes] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const { addToast } = useToast();

  const fetchToday = useCallback(async (silent = false) => {
    if (!silent) setLoading(prev => prev);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await api.get(`/reservations?date=${today}`);
      setReservations(data.sort((a, b) => a.pickup_datetime.localeCompare(b.pickup_datetime)));
      setLastSynced(new Date());
    } catch {
      addToast('Failed to refresh runs', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchToday();
    api.get('/drivers').then(setDrivers).catch(() => {});
    const refresh = setInterval(() => fetchToday(true), 60_000);
    const tick    = setInterval(() => setTick(t => t + 1), 15_000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [fetchToday]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.patch(`/reservations/${id}`, { status });
      setReservations(prev => prev.map(r => r.id === id ? updated : r));
      addToast('Status updated', 'success');
    } catch { addToast('Failed to update status', 'error'); }
  };

  const handleDriverChange = async (id, driverName) => {
    const driver = drivers.find(d => d.name === driverName);
    const patch = {
      driver_assigned: driverName || null,
      ...(driverName && driver?.vehicle ? { vehicle_assigned: driver.vehicle } : {}),
    };
    try {
      const updated = await api.patch(`/reservations/${id}`, patch);
      setReservations(prev => prev.map(r => r.id === id ? updated : r));
      addToast(driverName ? `Assigned: ${driverName}` : 'Driver unassigned', 'success');
    } catch { addToast('Failed to assign driver', 'error'); }
  };

  const handleSaved = (res) => {
    const today = new Date().toISOString().slice(0, 10);
    if (editingRes) {
      setReservations(prev => prev.map(r => r.id === res.id ? res : r));
    } else if ((res.pickup_datetime || '').startsWith(today)) {
      setReservations(prev => [...prev, res].sort((a, b) => a.pickup_datetime.localeCompare(b.pickup_datetime)));
    }
    setShowModal(false); setEditingRes(null);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Today's Runs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Last synced {relativeTime(lastSynced)}
            </span>
          )}
          <button onClick={() => fetchToday(true)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { setEditingRes(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm rounded-lg transition-colors">
            <Plus size={15} /> New Reservation
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {STAT_KEYS.map(s => {
          const count = reservations.filter(r => r.status === s).length;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? null : s)}
              className={`rounded-xl p-3 text-center transition-all cursor-pointer ${
                active
                  ? 'bg-brand-500/15 border-2 border-brand-500/50 ring-1 ring-brand-500/20'
                  : 'bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/60'
              }`}
            >
              <div className={`text-2xl font-bold ${active ? 'text-brand-400' : 'text-white'}`}>{count}</div>
              <div className={`text-[11px] mt-0.5 ${active ? 'text-brand-400/70' : 'text-gray-500'}`}>{s}</div>
            </button>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {statusFilter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400">Showing:</span>
          <span className="text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/30 px-2.5 py-1 rounded-full">
            {statusFilter}
          </span>
          <button onClick={() => setStatusFilter(null)} className="text-xs text-gray-500 hover:text-white transition-colors">
            Clear filter
          </button>
        </div>
      )}

      {/* Cards */}
      {(() => {
        const filtered = statusFilter
          ? reservations.filter(r => r.status === statusFilter)
          : reservations;

        return filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-4xl mb-3">🚗</div>
            {statusFilter ? (
              <>
                <p className="text-lg font-medium text-gray-500">No {statusFilter.toLowerCase()} runs today</p>
                <p className="text-sm mt-1">Try a different filter or <button onClick={() => setStatusFilter(null)} className="text-brand-400 hover:underline">view all runs</button>.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-500">No runs scheduled today</p>
                <p className="text-sm mt-1">All clear — or add a new reservation above.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <ReservationCard key={r.id} r={r}
                drivers={drivers}
                onStatusChange={handleStatusChange}
                onDriverChange={handleDriverChange}
                onEdit={() => { setEditingRes(r); setShowModal(true); }}
              />
            ))}
          </div>
        );
      })()}

      {showModal && (
        <ReservationModal reservation={editingRes} onClose={() => { setShowModal(false); setEditingRes(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
