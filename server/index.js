require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDb } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Attach io to requests so routes can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

initDb();

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/drivers',      require('./routes/drivers'));
app.use('/api/reviews',      require('./routes/reviews'));
app.use('/api/tracking',     require('./routes/tracking'));
app.use('/api/webhook',      require('./routes/webhook'));

// Public review page — served at /review/:token
const path = require('path');
app.get('/review/:token', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'review.html'));
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// AviationStack flight lookup — keeps API key server-side
app.get('/api/flights', async (req, res) => {
  const key    = process.env.AVIATIONSTACK_API_KEY;
  const number = (req.query.number || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!key || key === 'your_key_here') {
    return res.status(503).json({ error: 'Add your AVIATIONSTACK_API_KEY to .env' });
  }
  if (!number) return res.status(400).json({ error: 'number is required' });

  try {
    // Free plan is HTTP only
    const url = `http://api.aviationstack.com/v1/flights?` +
      new URLSearchParams({ access_key: key, flight_iata: number, limit: '5' });

    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return res.status(502).json({ error: 'AviationStack error' });

    const body = await response.json();
    if (body.error) return res.status(422).json({ error: body.error.message || 'API error' });

    const flights = (body.data || []);
    if (!flights.length) return res.json(null);

    // Prefer active/scheduled over old landed flights; take first
    const f = flights.find(x => ['active','scheduled'].includes(x.flight_status)) || flights[0];

    res.json({
      iata:               f.flight?.iata  || number,
      airline:            f.airline?.name || '—',
      from:               f.departure?.iata        || '—',
      from_airport:       f.departure?.airport     || '—',
      to:                 f.arrival?.iata          || '—',
      to_airport:         f.arrival?.airport       || '—',
      scheduled_arrival:  f.arrival?.scheduled     || null,
      estimated_arrival:  f.arrival?.estimated     || null,
      actual_arrival:     f.arrival?.actual        || null,
      status:             f.flight_status          || 'unknown',
      date:               f.flight_date            || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Geocoding proxy — Nominatim/OpenStreetMap, no API key required
app.get('/api/geocode', async (req, res) => {
  const q = (req.query.q || '').trim();
  const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
  const userLon = req.query.lon ? parseFloat(req.query.lon) : null;

  if (q.length < 3) return res.json([]);

  try {
    const params = { q, format: 'json', limit: '10', addressdetails: '1', countrycodes: 'us' };

    // If user location provided, add viewbox to prioritize nearby results
    if (userLat && userLon && !isNaN(userLat) && !isNaN(userLon)) {
      const radius = 0.1; // ~10km radius
      params.viewbox = `${userLon - radius},${userLat + radius},${userLon + radius},${userLat - radius}`;
      params.bounded = '1';
    }

    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CJDiorCarService/1.0',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) return res.json([]);
    const data = await response.json();

    // Format addresses: extract street, city, state, zip only
    const seen = new Set();
    const results = data.map(r => {
      const addr = r.address || {};
      const parts = [];

      // Build street address (number + road)
      if (addr.house_number && addr.road) {
        parts.push(`${addr.house_number} ${addr.road}`);
      } else if (addr.road) {
        parts.push(addr.road);
      } else if (addr.house_number) {
        parts.push(addr.house_number);
      }

      // Add city
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village);
      }

      // Add state (abbreviation preferred)
      if (addr.state) {
        parts.push(addr.state);
      }

      // Add zip code
      if (addr.postcode) {
        parts.push(addr.postcode);
      }

      return parts.filter(p => p).join(' ');
    }).filter(name => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    res.json(results);
  } catch {
    res.json([]);
  }
});

// WebSocket connection handler
io.on('connection', (socket) => {
  socket.on('subscribe-trip', (driverId) => {
    socket.join(`driver_${driverId}`);
  });
  socket.on('unsubscribe-trip', (driverId) => {
    socket.leave(`driver_${driverId}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n  CJ Dior Car Service API`);
  console.log(`  ─────────────────────────`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  WebSocket ready on ws://localhost:${PORT}\n`);
});
