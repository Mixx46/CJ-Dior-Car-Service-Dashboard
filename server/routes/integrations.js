const express = require('express');
const jwt = require('jsonwebtoken');
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

router.get('/', requireAdmin, (_req, res) => {
  res.json({
    retell: {
      connected: !!(process.env.RETELL_API_KEY),
      webhookUrl: process.env.RETELL_WEBHOOK_URL || '',
      phoneNumber: process.env.RETELL_PHONE_NUMBER || '',
    },
    twilio: {
      connected: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    sendgrid: {
      connected: !!(process.env.SENDGRID_API_KEY),
    },
    aviationstack: {
      connected: !!(process.env.AVIATIONSTACK_API_KEY && process.env.AVIATIONSTACK_API_KEY !== 'your_key_here'),
    },
  });
});

router.patch('/', requireAdmin, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../../.env');

  let envContent = '';
  try { envContent = fs.readFileSync(envPath, 'utf8'); } catch {}

  const updates = req.body || {};
  const allowed = [
    'RETELL_API_KEY', 'RETELL_WEBHOOK_URL', 'RETELL_PHONE_NUMBER',
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
    'SENDGRID_API_KEY',
    'AVIATIONSTACK_API_KEY',
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.includes(key)) continue;
    process.env[key] = value;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
  res.json({ ok: true });
});

// POST /api/integrations/distance-matrix - Calculate distance and ETA using Google Maps
router.post('/distance-matrix', async (req, res) => {
  const { origin, destination } = req.body;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(503).json({ error: 'Google Maps API not configured' });
  }

  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination required (with lat/lng properties)' });
  }

  try {
    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string'
      ? destination
      : `${destination.lat},${destination.lng}`;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      new URLSearchParams({
        origins: originStr,
        destinations: destStr,
        key: apiKey,
      });

    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      return res.status(502).json({ error: 'Google Maps API error' });
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.rows[0] || !data.rows[0].elements[0]) {
      return res.status(422).json({ error: 'Unable to calculate distance' });
    }

    const element = data.rows[0].elements[0];
    if (element.status !== 'OK') {
      return res.status(422).json({ error: element.error_message || 'Distance calculation failed' });
    }

    res.json({
      distance_meters: element.distance.value,
      distance_km: element.distance.value / 1000,
      distance_text: element.distance.text,
      duration_seconds: element.duration.value,
      duration_minutes: Math.ceil(element.duration.value / 60),
      duration_text: element.duration.text,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
