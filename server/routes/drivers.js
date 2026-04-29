const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { db } = require('../db');

const ALLOWED_STATUSES = ['Available', 'On Run', 'Off Duty'];
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

const getDriverFromToken = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), SECRET);
    if (payload.user_type !== 'driver' || !payload.driver_id) return null;
    return payload.driver_id;
  } catch {
    return null;
  }
};

// GET /api/drivers
router.get('/', requireAdmin, (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM drivers ORDER BY name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drivers
router.post('/', requireAdmin, (req, res) => {
  const { name, phone, vehicle, status = 'Available' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status: ${status}` });

  try {
    const result = db.prepare('INSERT INTO drivers (name, phone, vehicle, status) VALUES (?, ?, ?, ?)').run(
      name, phone || null, vehicle || null, status
    );
    const created = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/drivers/:id
router.patch('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Driver not found' });

  const updates = req.body;
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
    return res.status(400).json({ error: `Invalid status: ${updates.status}` });
  }

  try {
    const set = fields.map(f => `${f} = ?`).join(', ');
    db.prepare(`UPDATE drivers SET ${set} WHERE id = ?`).run(...fields.map(f => updates[f]), id);
    const updated = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/portal/today - Get today's trips for authenticated driver
router.get('/portal/today', (req, res) => {
  const driverId = getDriverFromToken(req);
  if (!driverId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pad = (n) => String(n).padStart(2, '0');
    const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const trips = db.prepare(`
      SELECT r.*, d.name as driver_name, d.vehicle, d.average_rating, d.total_reviews
      FROM reservations r
      LEFT JOIN drivers d ON r.driver_assigned = d.name
      WHERE r.driver_assigned = (SELECT name FROM drivers WHERE id = ?)
      AND DATE(r.pickup_datetime) = ?
      ORDER BY r.pickup_datetime ASC
    `).all(driverId, fmtDate(today));

    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/portal/trips - Get all trips for authenticated driver
router.get('/portal/trips', (req, res) => {
  const driverId = getDriverFromToken(req);
  if (!driverId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const trips = db.prepare(`
      SELECT r.*, d.name as driver_name, d.vehicle, d.average_rating, d.total_reviews
      FROM reservations r
      LEFT JOIN drivers d ON r.driver_assigned = d.name
      WHERE r.driver_assigned = (SELECT name FROM drivers WHERE id = ?)
      ORDER BY r.pickup_datetime DESC
    `).all(driverId);

    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/portal/reviews - Get reviews for authenticated driver
router.get('/portal/reviews', (req, res) => {
  const driverId = getDriverFromToken(req);
  if (!driverId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const reviews = db.prepare(`
      SELECT * FROM reviews
      WHERE driver_id = ? AND submitted = 1
      ORDER BY submitted_at DESC
    `).all(driverId);

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/portal/profile - Get profile for authenticated driver
router.get('/portal/profile', (req, res) => {
  const driverId = getDriverFromToken(req);
  if (!driverId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const stats = db.prepare(`
      SELECT
        COUNT(CASE WHEN status IN ('Confirmed', 'En Route') THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN r.tip_amount ELSE 0 END), 0) as total_tips
      FROM reservations r
      WHERE r.driver_assigned = ?
    `).get(driver.name);

    res.json({ ...driver, ...stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
