const express = require('express');
const router = express.Router();
const { db, generateBookingId } = require('../db');

// POST /api/webhook/vicky
router.post('/vicky', (req, res) => {
  const secret = process.env.VICKY_WEBHOOK_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (secret && token !== secret) {
    db.prepare('INSERT INTO webhooks_log (call_id, status, error_message) VALUES (?, ?, ?)').run(
      req.body?.call_id || null, 'rejected', 'Unauthorized: invalid token'
    );
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  const callId = payload?.call_id || null;
  const data = payload?.call_analysis?.custom_analysis_data || {};

  const requiredFields = ['client_name', 'pickup_datetime', 'pickup_address', 'dropoff_address'];
  const missing = requiredFields.filter(f => !data[f]);
  if (missing.length > 0) {
    const msg = `Missing required fields: ${missing.join(', ')}`;
    db.prepare('INSERT INTO webhooks_log (call_id, status, error_message) VALUES (?, ?, ?)').run(
      callId, 'error', msg
    );
    return res.status(400).json({ error: msg });
  }

  try {
    const booking_id = generateBookingId();

    db.prepare(`
      INSERT INTO reservations
        (booking_id, client_name, client_phone, client_email, pickup_datetime,
         pickup_address, dropoff_address, passenger_count, trip_notes,
         status, source, raw_vicky_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'AI Phone Agent', ?)
    `).run(
      booking_id,
      data.client_name,
      data.client_phone   || null,
      data.client_email   || null,
      data.pickup_datetime,
      data.pickup_address,
      data.dropoff_address,
      data.passenger_count || 1,
      data.trip_notes      || null,
      JSON.stringify(payload)
    );

    db.prepare('INSERT INTO webhooks_log (call_id, status) VALUES (?, ?)').run(callId, 'success');
    res.json({ ok: true, booking_id });
  } catch (err) {
    db.prepare('INSERT INTO webhooks_log (call_id, status, error_message) VALUES (?, ?, ?)').run(
      callId, 'error', err.message
    );
    res.status(500).json({ error: err.message });
  }
});

// GET /api/webhook/log — inspection endpoint
router.get('/log', (_req, res) => {
  const rows = db.prepare('SELECT * FROM webhooks_log ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

module.exports = router;
