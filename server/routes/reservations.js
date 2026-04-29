const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { db, generateBookingId } = require('../db');

const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'En Route', 'Completed', 'Cancelled'];
const ALLOWED_SOURCES  = ['Manual', 'AI Phone Agent'];
const SECRET = process.env.JWT_SECRET || 'cjdior-dispatch-secret-key';

const requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.slice(7), SECRET);
    if (payload.user_type !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Deserialize JSON columns before sending to client
function parseRow(r) {
  return {
    ...r,
    flight_data: r.flight_data
      ? (() => { try { return JSON.parse(r.flight_data); } catch { return null; } })()
      : null,
  };
}

// GET /api/reservations
router.get('/', requireAdmin, (req, res) => {
  const { date, dateFrom, dateTo, status, source, search } = req.query;

  let query = 'SELECT * FROM reservations WHERE 1=1';
  const params = [];

  if (date) {
    query += ' AND DATE(pickup_datetime) = ?';
    params.push(date);
  }
  if (dateFrom) {
    query += ' AND DATE(pickup_datetime) >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND DATE(pickup_datetime) <= ?';
    params.push(dateTo);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }
  if (search) {
    query += ' AND (client_name LIKE ? OR booking_id LIKE ? OR client_phone LIKE ? OR client_email LIKE ? OR pickup_address LIKE ? OR dropoff_address LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s);
  }

  query += ' ORDER BY pickup_datetime ASC';

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(parseRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reservations
router.post('/', requireAdmin, (req, res) => {
  const {
    client_name, client_phone, client_email,
    pickup_datetime, pickup_address, dropoff_address,
    vehicle_assigned, driver_assigned, passenger_count,
    status = 'Pending', source = 'Manual', trip_notes,
    raw_vicky_payload, luggage_count, flight_number, flight_data,
    is_company = false, company_name,
    card_type, card_number, card_expiry,
  } = req.body;

  if (!client_name || !pickup_datetime || !pickup_address || !dropoff_address) {
    return res.status(400).json({ error: 'client_name, pickup_datetime, pickup_address, and dropoff_address are required' });
  }
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
  }
  if (source && !ALLOWED_SOURCES.includes(source)) {
    return res.status(400).json({ error: `Invalid source: ${source}` });
  }

  try {
    const booking_id = generateBookingId();
    const flightJson = flight_data
      ? (typeof flight_data === 'string' ? flight_data : JSON.stringify(flight_data))
      : null;

    const result = db.prepare(`
      INSERT INTO reservations
        (booking_id, client_name, client_phone, client_email, pickup_datetime,
         pickup_address, dropoff_address, vehicle_assigned, driver_assigned,
         passenger_count, status, source, trip_notes, raw_vicky_payload,
         luggage_count, flight_number, flight_data, is_company, company_name,
         card_type, card_number, card_expiry)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      booking_id, client_name, client_phone || null, client_email || null,
      pickup_datetime, pickup_address, dropoff_address,
      vehicle_assigned || null, driver_assigned || null,
      passenger_count || 1, status, source,
      trip_notes || null, raw_vicky_payload || null,
      luggage_count || 0, flight_number || null, flightJson,
      is_company ? 1 : 0, company_name || null,
      card_type || null, card_number || null, card_expiry || null
    );

    // Add/update customer if company reservation
    if (is_company && company_name) {
      const existing = db.prepare('SELECT id FROM customers WHERE name = ?').get(company_name);
      if (existing) {
        db.prepare('UPDATE customers SET phone = ?, email = ? WHERE id = ?').run(
          client_phone || null, client_email || null, existing.id
        );
      } else {
        db.prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)').run(
          company_name, client_phone || null, client_email || null
        );
      }
    }

    const created = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseRow(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/addresses — distinct pickup + dropoff addresses for autocomplete
router.get('/addresses', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT address FROM (
        SELECT pickup_address  AS address FROM reservations WHERE pickup_address  IS NOT NULL AND pickup_address  != ''
        UNION
        SELECT dropoff_address AS address FROM reservations WHERE dropoff_address IS NOT NULL AND dropoff_address != ''
      ) ORDER BY address ASC
    `).all();
    res.json(rows.map(r => r.address));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reservations/:id
router.patch('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Reservation not found' });

  const IMMUTABLE = new Set(['id', 'booking_id', 'created_at']);
  const updates = { ...req.body };

  // Serialize flight_data object → JSON string for SQLite
  if (updates.flight_data !== undefined && updates.flight_data !== null && typeof updates.flight_data === 'object') {
    updates.flight_data = JSON.stringify(updates.flight_data);
  }

  const fields = Object.keys(updates).filter(k => !IMMUTABLE.has(k));
  if (fields.length === 0) return res.status(400).json({ error: 'No updatable fields provided' });

  if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
    return res.status(400).json({ error: `Invalid status: ${updates.status}` });
  }

  try {
    const set = fields.map(f => `${f} = ?`).join(', ');
    db.prepare(`UPDATE reservations SET ${set} WHERE id = ?`).run(...fields.map(f => updates[f]), id);
    const updated = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);

    // Auto-generate tracking session when trip starts
    if (updates.status === 'En Route' && existing.status !== 'En Route') {
      const alreadyHasTracking = db.prepare('SELECT id FROM tracking_sessions WHERE reservation_id = ?').get(id);
      if (!alreadyHasTracking) {
        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (parseInt(process.env.TRACKING_SESSION_EXPIRES_HOURS) || 24));
        db.prepare(`
          INSERT INTO tracking_sessions (reservation_id, token, expires_at)
          VALUES (?, ?, ?)
        `).run(id, token, expiresAt.toISOString());
      }
    }

    // Auto-generate review link when ride is completed
    if (updates.status === 'Completed' && existing.status !== 'Completed') {
      const alreadyHasReview = db.prepare('SELECT id FROM reviews WHERE reservation_id = ?').get(id);
      if (!alreadyHasReview) {
        const token = crypto.randomBytes(16).toString('hex');
        db.prepare(`
          INSERT INTO reviews (reservation_id, token, client_name, client_phone, driver_name)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, token, updated.client_name, updated.client_phone, updated.driver_assigned);
      }
    }

    // Update customer if company reservation is being set or company name is updated
    if (updated.is_company && updated.company_name) {
      const customerName = updated.company_name;
      const existing_customer = db.prepare('SELECT id FROM customers WHERE name = ?').get(customerName);
      if (existing_customer) {
        db.prepare('UPDATE customers SET phone = ?, email = ? WHERE id = ?').run(
          updated.client_phone || null, updated.client_email || null, existing_customer.id
        );
      } else {
        db.prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)').run(
          customerName, updated.client_phone || null, updated.client_email || null
        );
      }
    }

    res.json(parseRow(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
