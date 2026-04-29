const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const router = express.Router();

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

router.get('/', requireAdmin, (req, res) => {
  const { search } = req.query;
  let rows;
  if (search) {
    const like = `%${search}%`;
    rows = db.prepare(
      `SELECT c.*, COUNT(r.id) as total_rides,
              MAX(r.pickup_datetime) as last_ride
       FROM customers c
       LEFT JOIN reservations r ON LOWER(r.client_name) = LOWER(c.name)
       WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
       GROUP BY c.id
       ORDER BY c.name`
    ).all(like, like, like);
  } else {
    rows = db.prepare(
      `SELECT c.*, COUNT(r.id) as total_rides,
              MAX(r.pickup_datetime) as last_ride
       FROM customers c
       LEFT JOIN reservations r ON LOWER(r.client_name) = LOWER(c.name)
       GROUP BY c.id
       ORDER BY c.name`
    ).all();
  }
  res.json(rows);
});

router.get('/:id', requireAdmin, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const rides = db.prepare(
    `SELECT * FROM reservations WHERE LOWER(client_name) = LOWER(?) ORDER BY pickup_datetime DESC`
  ).all(customer.name);

  res.json({ ...customer, rides });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, phone, email, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(
    'INSERT INTO customers (name, phone, email, notes) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), phone?.trim() || null, email?.trim() || null, notes?.trim() || null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(customer);
});

router.patch('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const fields = {};
  for (const key of ['name', 'phone', 'email', 'notes']) {
    if (req.body[key] !== undefined) fields[key] = req.body[key]?.trim() || null;
  }
  if (fields.name === null) return res.status(400).json({ error: 'Name is required' });

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  if (sets) {
    db.prepare(`UPDATE customers SET ${sets} WHERE id = ?`).run(...Object.values(fields), req.params.id);
  }

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
