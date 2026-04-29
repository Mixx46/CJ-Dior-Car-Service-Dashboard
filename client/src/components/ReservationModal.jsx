import { useState, useEffect } from 'react';
import { X, Loader2, Plane, Luggage, Search, Edit2 } from 'lucide-react';
import { api, fmtDateTime } from '../utils/api';
import { useToast } from '../hooks/useToast';
import AddressAutocomplete from './AddressAutocomplete';
import { invalidateAddressCache } from '../utils/addressCache';
import { FLEET } from '../data/fleet';

const STATUSES = ['Pending', 'Confirmed', 'En Route', 'Completed', 'Cancelled'];
const SOURCES  = ['Manual', 'AI Phone Agent'];

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
      opts.push({ value: `${hh}:${mm}`, label });
    }
  }
  return opts;
})();

const FLIGHT_STATUS_COLOR = {
  scheduled: 'text-blue-400',
  active:    'text-green-400',
  landed:    'text-green-400',
  cancelled: 'text-rose-400',
  diverted:  'text-orange-400',
  incident:  'text-rose-400',
};

function toLocalInput(str) {
  if (!str) return '';
  return str.includes('T') ? str.slice(0, 16) : str.replace(' ', 'T').slice(0, 16);
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function FlightCard({ data, onClear }) {
  const color = FLIGHT_STATUS_COLOR[data.status] || 'text-gray-400';
  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane size={13} className="text-brand-400" />
          <span className="font-semibold text-white text-sm">{data.iata}</span>
          <span className="text-gray-400 text-xs">·</span>
          <span className="text-gray-300 text-xs">{data.airline}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs capitalize font-medium ${color}`}>● {data.status}</span>
          <button type="button" onClick={onClear} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        <span className="font-medium text-gray-300">{data.from}</span>
        <span className="text-gray-600 mx-1.5">→</span>
        <span className="font-medium text-gray-300">{data.to}</span>
        <span className="text-gray-600 mx-1.5">·</span>
        <span>{data.to_airport}</span>
      </div>
      {data.scheduled_arrival && (
        <div className="text-xs text-gray-500 space-x-3">
          <span>Sched: <span className="text-gray-300">{fmtDateTime(data.scheduled_arrival)}</span></span>
          {data.estimated_arrival && data.estimated_arrival !== data.scheduled_arrival && (
            <span>Est: <span className="text-amber-400">{fmtDateTime(data.estimated_arrival)}</span></span>
          )}
          {data.actual_arrival && (
            <span>Actual: <span className="text-green-400">{fmtDateTime(data.actual_arrival)}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 placeholder:text-gray-600 transition-colors';
const selectCls = `${inputCls} cursor-pointer`;

export default function ReservationModal({ reservation, onClose, onSaved }) {
  const { addToast } = useToast();
  const [drivers, setDrivers]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const isEdit = !!reservation;

  const blank = {
    client_name:      '',
    client_phone:     '',
    client_email:     '',
    is_company:       false,
    company_name:     '',
    pickup_date:      '',
    pickup_time:      '',
    pickup_address:   '',
    dropoff_address:  '',
    vehicle_assigned: '',
    driver_assigned:  '',
    passenger_count:  1,
    luggage_count:    0,
    status:           'Pending',
    source:           'Manual',
    trip_notes:       '',
    flight_number:    '',
    flight_data:      null,
    card_type:        '',
    card_number:      '',
    card_expiry:      '',
    card_cvv:         '',
  };

  const [form, setForm] = useState(blank);

  useEffect(() => {
    api.get('/drivers').then(setDrivers).catch(() => {});
    if (reservation) {
      setForm({
        client_name:      reservation.client_name      || '',
        client_phone:     reservation.client_phone     || '',
        client_email:     reservation.client_email     || '',
        pickup_date:      toLocalInput(reservation.pickup_datetime).slice(0, 10),
        pickup_time:      toLocalInput(reservation.pickup_datetime).slice(11, 16),
        pickup_address:   reservation.pickup_address   || '',
        dropoff_address:  reservation.dropoff_address  || '',
        vehicle_assigned: reservation.vehicle_assigned || '',
        driver_assigned:  reservation.driver_assigned  || '',
        passenger_count:  reservation.passenger_count  || 1,
        luggage_count:    reservation.luggage_count    || 0,
        status:           reservation.status           || 'Pending',
        source:           reservation.source           || 'Manual',
        trip_notes:       reservation.trip_notes       || '',
        flight_number:    reservation.flight_number    || '',
        flight_data:      reservation.flight_data      || null,
        is_company:       reservation.is_company       || false,
        company_name:     reservation.company_name     || '',
        card_type:        reservation.card_type        || '',
        card_number:      reservation.card_number      || '',
        card_expiry:      reservation.card_expiry      || '',
        card_cvv:         '',
      });
    }
  }, [reservation]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    setForm(f => ({ ...f, client_phone: formatted }));
  };

  const handleCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    setForm(f => ({ ...f, card_number: digits }));
  };

  const handleCardExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    setForm(f => ({ ...f, card_expiry: val }));
  };

  const handleCardCVVChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm(f => ({ ...f, card_cvv: digits }));
  };

  const cardDisplayValue = form.card_number ? `•••• •••• •••• ${form.card_number.slice(-4)}` : '';

  const lookupFlight = async () => {
    const num = form.flight_number.trim().replace(/\s+/g, '').toUpperCase();
    if (!num) return;
    setLookingUp(true);
    try {
      const data = await api.get(`/flights?number=${encodeURIComponent(num)}`);
      if (data) {
        setForm(f => ({ ...f, flight_data: data }));
        addToast(`${data.iata} · ${data.airline} found`, 'success');
      } else {
        addToast('Flight not found — check the number and try again', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Flight lookup failed', 'error');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      pickup_datetime: `${form.pickup_date} ${form.pickup_time || '00:00'}`,
      passenger_count: Number(form.passenger_count),
      luggage_count:   Number(form.luggage_count),
      flight_number:   form.flight_number.trim().toUpperCase() || null,
      card_cvv:        undefined, // Never send CVV
    };
    delete payload.pickup_date;
    delete payload.pickup_time;

    setSaving(true);
    try {
      let result;
      if (isEdit) {
        result = await api.patch(`/reservations/${reservation.id}`, payload);
        addToast(`Reservation ${result.booking_id} updated`, 'success');
      } else {
        result = await api.post('/reservations', payload);
        addToast(`Reservation ${result.booking_id} created`, 'success');
      }
      invalidateAddressCache();
      onSaved(result);
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold">{isEdit ? 'Edit Reservation' : 'New Reservation'}</h2>
            {isEdit && <p className="text-xs text-gray-500 font-mono mt-0.5">{reservation.booking_id}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Row 1: Name / Phone */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name" required>
              <input className={inputCls} value={form.client_name} onChange={set('client_name')} placeholder="Full name" required />
            </Field>
            <Field label="Phone" required>
              <input className={inputCls} value={form.client_phone} onChange={handlePhoneChange} placeholder="305-555-0000" required />
            </Field>
          </div>

          {/* Row 2: Email / Passengers / Luggage */}
          <div className="grid grid-cols-[1fr_100px_100px] gap-4">
            <Field label="Email" required>
              <input className={inputCls} type="email" value={form.client_email} onChange={set('client_email')} placeholder="client@email.com" required />
            </Field>
            <Field label="Passengers">
              <input className={inputCls} type="number" min="1" max="20" value={form.passenger_count} onChange={set('passenger_count')} />
            </Field>
            <Field label="Luggage">
              <div className="relative">
                <Luggage size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input className={`${inputCls} pl-8`} type="number" min="0" max="30" value={form.luggage_count} onChange={set('luggage_count')} />
              </div>
            </Field>
          </div>

          {/* Row 2b: Company */}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_company" checked={form.is_company} onChange={e => setForm(f => ({ ...f, is_company: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="is_company" className="text-sm text-gray-400">Company reservation</label>
          </div>

          {form.is_company && (
            <Field label="Company Name" required>
              <input className={inputCls} value={form.company_name} onChange={set('company_name')} placeholder="Company name" required />
            </Field>
          )}

          {/* Row 3: Pickup date / time / Status */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Pickup Date" required>
              <input className={inputCls} type="date" value={form.pickup_date} onChange={set('pickup_date')} required />
            </Field>
            <Field label="Pickup Time" required>
              <select className={selectCls} value={form.pickup_time} onChange={set('pickup_time')} required>
                <option value="">— Time —</option>
                {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Pickup address */}
          <Field label="Pickup Address" required>
            <AddressAutocomplete
              value={form.pickup_address}
              onChange={v => setForm(f => ({ ...f, pickup_address: v }))}
              placeholder="Full pickup address or landmark"
              required
            />
          </Field>

          {/* Dropoff address */}
          <Field label="Dropoff Address" required>
            <AddressAutocomplete
              value={form.dropoff_address}
              onChange={v => setForm(f => ({ ...f, dropoff_address: v }))}
              placeholder="Full dropoff address or landmark"
              required
            />
          </Field>

          {/* Card Info */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Method</span>

            <Field label="Card Type">
              <select className={selectCls} value={form.card_type} onChange={set('card_type')}>
                <option value="">— None —</option>
                <option value="Credit">Credit Card</option>
                <option value="Debit">Debit Card</option>
              </select>
            </Field>

            {form.card_type && !form.card_number && (
              <>
                <Field label="Card Number" required>
                  <input className={inputCls} value={form.card_number} onChange={handleCardNumberChange} placeholder="1234 5678 9012 3456" maxLength="16" inputMode="numeric" required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry (MM/YY)" required>
                    <input className={inputCls} value={form.card_expiry} onChange={handleCardExpiryChange} placeholder="MM/YY" maxLength="5" inputMode="numeric" required />
                  </Field>
                  <Field label="CVV" required>
                    <input className={inputCls} value={form.card_cvv} onChange={handleCardCVVChange} placeholder="123" maxLength="4" inputMode="numeric" required />
                  </Field>
                </div>
              </>
            )}

            {form.card_number && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-400 flex-1">
                    <p className="font-mono tracking-widest">{cardDisplayValue}</p>
                    <p className="text-xs mt-1">Expires: {form.card_expiry}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, card_type: '', card_number: '', card_expiry: '', card_cvv: '' }))}
                    className="ml-3 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors shrink-0"
                    title="Edit card"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Flight Info */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plane size={13} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Flight Info</span>
            </div>

            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1 font-mono tracking-widest`}
                value={form.flight_number}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setForm(f => ({ ...f, flight_number: val, ...(val === '' ? { flight_data: null } : {}) }));
                }}
                placeholder="AA 1247"
                maxLength={8}
              />
              <button
                type="button"
                onClick={lookupFlight}
                disabled={!form.flight_number.trim() || lookingUp}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors shrink-0"
              >
                {lookingUp
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Search size={13} />
                }
                {lookingUp ? 'Looking up…' : 'Look Up'}
              </button>
            </div>

            {form.flight_data && (
              <FlightCard
                data={form.flight_data}
                onClear={() => setForm(f => ({ ...f, flight_data: null }))}
              />
            )}

            {!form.flight_data && (
              <p className="text-xs text-gray-600">Enter a flight number (e.g. AA1247, DL404) and click Look Up to sync live flight data.</p>
            )}
          </div>

          {/* Driver / Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Driver">
              <select className={selectCls} value={form.driver_assigned} onChange={e => {
                const name = e.target.value;
                const driver = drivers.find(d => d.name === name);
                setForm(f => ({
                  ...f,
                  driver_assigned: name,
                  ...(driver?.vehicle ? { vehicle_assigned: driver.vehicle } : {}),
                }));
              }}>
                <option value="">— Unassigned —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.name}>{d.name} ({d.status})</option>
                ))}
              </select>
            </Field>
            <Field label="Type of Car" required>
              <select className={selectCls} value={form.vehicle_assigned} onChange={set('vehicle_assigned')} required>
                <option value="">— Select —</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Any">Any</option>
              </select>
            </Field>
          </div>

          {/* Source */}
          <Field label="Source">
            <select className={selectCls} value={form.source} onChange={set('source')}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          {/* Trip Notes */}
          <Field label="Trip Notes">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.trip_notes} onChange={set('trip_notes')} placeholder="Special instructions, flight info, VIP notes…" />
          </Field>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-black font-semibold text-sm rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
