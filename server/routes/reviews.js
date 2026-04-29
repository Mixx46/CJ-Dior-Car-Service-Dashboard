const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const router = express.Router();

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Admin: list all submitted reviews
router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT rv.*, r.booking_id, r.pickup_address, r.dropoff_address, r.pickup_datetime, r.vehicle_assigned
    FROM reviews rv
    LEFT JOIN reservations r ON r.id = rv.reservation_id
    ORDER BY rv.submitted_at DESC, rv.created_at DESC
  `).all();
  res.json(rows);
});

// Admin: get stats
router.get('/stats', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM reviews WHERE submitted = 1').get().cnt;
  const avg = db.prepare('SELECT AVG(rating) as avg FROM reviews WHERE submitted = 1 AND rating IS NOT NULL').get().avg;
  res.json({ totalReviews: total, averageRating: Math.round((avg || 0) * 10) / 10 });
});

// Admin: manually generate a review link for a reservation
router.post('/generate', (req, res) => {
  const { reservation_id } = req.body;
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservation_id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

  const existing = db.prepare('SELECT * FROM reviews WHERE reservation_id = ?').get(reservation_id);
  if (existing) return res.json({ token: existing.token, alreadyExists: true });

  const token = generateToken();
  db.prepare(`
    INSERT INTO reviews (reservation_id, token, client_name, client_phone, driver_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(reservation_id, token, reservation.client_name, reservation.client_phone, reservation.driver_assigned);

  res.status(201).json({ token });
});

// Public: get review info by token (no auth needed)
router.get('/public/:token', (req, res) => {
  const review = db.prepare(`
    SELECT rv.*, r.booking_id, r.pickup_address, r.dropoff_address, r.pickup_datetime, r.vehicle_assigned
    FROM reviews rv
    LEFT JOIN reservations r ON r.id = rv.reservation_id
    WHERE rv.token = ?
  `).get(req.params.token);

  if (!review) return res.status(404).json({ error: 'Review link not found' });
  if (review.submitted) return res.json({ ...review, alreadySubmitted: true });

  res.json(review);
});

// Public: submit a review (no auth needed)
router.post('/public/:token', (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE token = ?').get(req.params.token);
  if (!review) return res.status(404).json({ error: 'Review link not found' });
  if (review.submitted) return res.status(400).json({ error: 'Review already submitted' });

  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  db.prepare(`
    UPDATE reviews SET rating = ?, comment = ?, submitted = 1, submitted_at = datetime('now') WHERE token = ?
  `).run(rating, comment?.trim() || null, req.params.token);

  res.json({ ok: true });
});

module.exports = router;
