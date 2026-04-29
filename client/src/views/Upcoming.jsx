import { useState, useEffect } from 'react';
import { Plus, MapPin, Phone, User, Car, Pencil, Calendar } from 'lucide-react';
import { api, fmtDateTime, fmtDate } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ReservationModal from '../components/ReservationModal';
import { useToast } from '../hooks/useToast';

const STATUSES = ['Pending', 'Confirmed', 'En Route', 'Completed', 'Cancelled'];

function groupByDate(reservations) {
  return reservations.reduce((acc, r) => {
    const day = (r.pickup_datetime || '').slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {});
}

export default function Upcoming() {
  const [reservations, setReservations] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRes, setEditingRes] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { addToast } = useToast();

  const fetchUpcoming = async () => {
    try {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const end      = new Date(); end.setDate(end.getDate() + 7);
      const from = tomorrow.toISOString().slice(0, 10);
      const to   = end.toISOString().slice(0, 10);
      const data = await api.get(`/reservations?dateFrom=${from}&dateTo=${to}`);
      setReservations(data);
    } catch {
      addToast('Failed to load upcoming runs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
    api.get('/drivers').then(setDrivers).catch(() => {});
  }, []);

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
    if (editingRes) {
      setReservations(prev => prev.map(r => r.id === res.id ? res : r));
    } else {
      fetchUpcoming();
    }
    setShowModal(false); setEditingRes(null);
  };

  const grouped = groupByDate(reservations);
  const days = Object.keys(grouped).sort();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Upcoming</h1>
          <p className="text-sm text-gray-500 mt-0.5">Next 7 days</p>
        </div>
        <button onClick={() => { setEditingRes(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm rounded-lg transition-colors">
          <Plus size={15} /> New Reservation
        </button>
      </div>

      {loading ? <TableSkeleton rows={8} /> : days.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-lg font-medium text-gray-500">Nothing scheduled in the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(day => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-brand-400" />
                <h3 className="text-sm font-semibold text-brand-400">
                  {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{grouped[day].length} run{grouped[day].length !== 1 ? 's' : ''}</span>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {grouped[day].map((r, i) => {
                  const isAI = r.source === 'AI Phone Agent';
                  return (
                    <div key={r.id} className={`px-5 py-4 flex items-center gap-4 ${i < grouped[day].length - 1 ? 'border-b border-gray-800' : ''} ${isAI ? 'bg-amber-500/5' : ''} hover:bg-gray-800/50 transition-colors`}>
                      {/* Time */}
                      <div className="w-16 shrink-0 text-center">
                        <div className="text-white font-semibold text-sm">{(r.pickup_datetime || '').slice(11, 16)}</div>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm">{r.client_name}</span>
                          {isAI && <span title="Vicky AI booking">🤖</span>}
                          <span className="font-mono text-[10px] text-gray-600">{r.booking_id}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={11} className="text-brand-500" />
                          <span className="truncate">{r.pickup_address}</span>
                          <span className="mx-1">→</span>
                          <span className="truncate">{r.dropoff_address}</span>
                        </div>
                      </div>

                      {/* Driver */}
                      <div className="hidden md:block w-40 shrink-0">
                        <select
                          value={r.driver_assigned || ''}
                          onChange={e => handleDriverChange(r.id, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-gray-300"
                        >
                          <option value="">— Unassigned —</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status + edit */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={r.status}
                          onChange={e => handleStatusChange(r.id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                        >
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button onClick={() => { setEditingRes(r); setShowModal(true); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ReservationModal reservation={editingRes} onClose={() => { setShowModal(false); setEditingRes(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
