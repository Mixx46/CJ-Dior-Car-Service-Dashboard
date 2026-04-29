const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { db } = require('../db');

const SECRET = process.env.JWT_SECRET || 'cjdior-dispatch-secret-key';
const TRACKING_EXPIRES_HOURS = parseInt(process.env.TRACKING_SESSION_EXPIRES_HOURS || '24');

// Get driver ID from JWT token (driver auth only)
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

// Get admin from JWT token
const getAdminFromToken = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), SECRET);
    if (payload.user_type !== 'admin') return null;
    return true;
  } catch {
    return null;
  }
};

// Haversine distance calculation (lat/lon to km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Emit location update via socket.io
function emitLocationUpdate(io, driverId, data) {
  if (!io) return;
  const activeRooms = [`driver_${driverId}`];
  activeRooms.forEach(room => {
    io.to(room).emit('location-update', {
      driver_id: driverId,
      ...data,
    });
  });
}

// POST /api/tracking/location - Driver sends their live location
router.post('/location', (req, res) => {
  const driverId = getDriverFromToken(req);
  if (!driverId) return res.status(401).json({ error: 'Unauthorized' });

  const { latitude, longitude, accuracy, bearing, speed } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  try {
    // Store location
    db.prepare(`
      INSERT INTO driver_locations (driver_id, latitude, longitude, accuracy, bearing, speed)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(driverId, latitude, longitude, accuracy || null, bearing || null, speed || null);

    // Get driver name for later use
    const driver = db.prepare('SELECT name FROM drivers WHERE id = ?').get(driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Emit to socket.io (passed via req.io from server setup)
    if (req.io) {
      const activeReservation = db.prepare(`
        SELECT id FROM reservations
        WHERE driver_assigned = ? AND status IN ('En Route', 'Arrived', 'Passenger Onboard', 'In Transit')
        ORDER BY pickup_datetime DESC LIMIT 1
      `).get(driver.name);

      if (activeReservation) {
        emitLocationUpdate(req.io, driverId, {
          latitude,
          longitude,
          accuracy,
          bearing,
          speed,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tracking/test/seed-location - Development only: Insert mock location for testing
router.post('/test/seed-location', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoints disabled in production' });
  }

  const { driver_id, latitude, longitude, bearing } = req.body;
  if (!driver_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'driver_id, latitude, and longitude are required' });
  }

  try {
    db.prepare(`
      INSERT INTO driver_locations (driver_id, latitude, longitude, accuracy, bearing, speed, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      driver_id,
      latitude,
      longitude,
      50,
      bearing || 0,
      0,
      new Date().toISOString()
    );

    res.json({ success: true, message: 'Mock location inserted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tracking/:token - Public: Get tracking info for a reservation
router.get('/:token', (req, res) => {
  const { token } = req.params;

  try {
    // Validate tracking session
    const session = db.prepare(`
      SELECT * FROM tracking_sessions WHERE token = ?
    `).get(token);

    if (!session) return res.status(404).json({ error: 'Invalid tracking link' });

    // Check if expired
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).json({ error: 'Tracking link expired' });
    }

    // Get reservation details
    const reservation = db.prepare(`
      SELECT * FROM reservations WHERE id = ?
    `).get(session.reservation_id);

    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    // Get driver info
    let driver = null;
    let driverId = null;
    if (reservation.driver_assigned) {
      driver = db.prepare('SELECT id, name, average_rating, total_reviews FROM drivers WHERE name = ?').get(reservation.driver_assigned);
      if (driver) driverId = driver.id;
    }

    // Get current driver location
    let location = null;
    if (driverId) {
      location = db.prepare(`
        SELECT latitude, longitude, accuracy, bearing, speed, timestamp
        FROM driver_locations
        WHERE driver_id = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(driverId);
    }

    res.json({
      reservation: {
        id: reservation.id,
        booking_id: reservation.booking_id,
        client_name: reservation.client_name,
        pickup_datetime: reservation.pickup_datetime,
        pickup_address: reservation.pickup_address,
        dropoff_address: reservation.dropoff_address,
        status: reservation.status,
        passenger_count: reservation.passenger_count,
        trip_notes: reservation.trip_notes,
        vehicle_assigned: reservation.vehicle_assigned,
      },
      driver: driver ? {
        id: driver.id,
        name: driver.name,
        rating: driver.average_rating,
        reviews: driver.total_reviews,
      } : null,
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        bearing: location.bearing,
        speed: location.speed,
        timestamp: location.timestamp,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tracking/active-drivers - Admin: Get all active drivers with current trips
router.get('/admin/active-drivers', (req, res) => {
  if (!getAdminFromToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const activeTrips = db.prepare(`
      SELECT
        r.id,
        r.booking_id,
        r.driver_assigned,
        r.status,
        r.pickup_datetime,
        r.pickup_address,
        r.dropoff_address,
        r.passenger_count,
        d.id as driver_id,
        d.average_rating,
        d.vehicle,
        dl.latitude,
        dl.longitude,
        dl.accuracy,
        dl.bearing,
        dl.speed,
        dl.timestamp as location_timestamp
      FROM reservations r
      LEFT JOIN drivers d ON r.driver_assigned = d.name
      LEFT JOIN driver_locations dl ON d.id = dl.driver_id
      WHERE r.status IN ('En Route', 'Arrived', 'Passenger Onboard', 'In Transit')
      AND dl.timestamp IS NOT NULL
      AND dl.timestamp = (
        SELECT timestamp FROM driver_locations
        WHERE driver_id = d.id
        ORDER BY timestamp DESC LIMIT 1
      )
      ORDER BY r.pickup_datetime ASC
    `).all();

    res.json(activeTrips.map(t => ({
      trip_id: t.id,
      booking_id: t.booking_id,
      driver_id: t.driver_id,
      driver_name: t.driver_assigned,
      status: t.status,
      vehicle: t.vehicle,
      rating: t.average_rating,
      pickup_address: t.pickup_address,
      dropoff_address: t.dropoff_address,
      passenger_count: t.passenger_count,
      location: {
        latitude: t.latitude,
        longitude: t.longitude,
        accuracy: t.accuracy,
        bearing: t.bearing,
        speed: t.speed,
      },
      location_timestamp: t.location_timestamp,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tracking/generate - Generate a tracking link (internal use)
router.post('/generate', (req, res) => {
  const { reservation_id } = req.body;
  if (!reservation_id) {
    return res.status(400).json({ error: 'reservation_id is required' });
  }

  try {
    const reservation = db.prepare('SELECT id FROM reservations WHERE id = ?').get(reservation_id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    // Check if tracking session already exists
    const existing = db.prepare('SELECT token FROM tracking_sessions WHERE reservation_id = ?').get(reservation_id);
    if (existing) {
      return res.json({ token: existing.token });
    }

    // Generate token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TRACKING_EXPIRES_HOURS);

    db.prepare(`
      INSERT INTO tracking_sessions (reservation_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(reservation_id, token, expiresAt.toISOString());

    res.json({
      token,
      expires_at: expiresAt.toISOString(),
      tracking_url: `${process.env.TRACKING_LINK_BASE_URL || 'http://localhost:5173'}/track/${token}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tracking/location-history/:reservation_id - Get historical location data (admin)
router.get('/location-history/:reservation_id', (req, res) => {
  if (!getAdminFromToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { reservation_id } = req.params;
  try {
    const reservation = db.prepare('SELECT driver_assigned FROM reservations WHERE id = ?').get(reservation_id);
    if (!reservation || !reservation.driver_assigned) {
      return res.json([]);
    }

    const driver = db.prepare('SELECT id FROM drivers WHERE name = ?').get(reservation.driver_assigned);
    if (!driver) return res.json([]);

    const locations = db.prepare(`
      SELECT latitude, longitude, accuracy, bearing, speed, timestamp
      FROM driver_locations
      WHERE driver_id = ?
      ORDER BY timestamp ASC
      LIMIT 1000
    `).all(driver.id);

    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
