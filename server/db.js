const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'cjdior.db'), {
  enableForeignKeyConstraints: true,
});

db.exec("PRAGMA journal_mode=WAL");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id        TEXT UNIQUE NOT NULL,
      client_name       TEXT NOT NULL,
      client_phone      TEXT,
      client_email      TEXT,
      pickup_datetime   TEXT NOT NULL,
      pickup_address    TEXT NOT NULL,
      dropoff_address   TEXT NOT NULL,
      vehicle_assigned  TEXT,
      driver_assigned   TEXT,
      passenger_count   INTEGER DEFAULT 1,
      status            TEXT DEFAULT 'Pending',
      source            TEXT DEFAULT 'Manual',
      trip_notes        TEXT,
      raw_vicky_payload TEXT,
      created_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      phone        TEXT,
      vehicle      TEXT,
      status       TEXT DEFAULT 'Available',
      license_id   TEXT,
      average_rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      total_tips   REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      make   TEXT NOT NULL,
      model  TEXT NOT NULL,
      year   INTEGER,
      plate  TEXT UNIQUE,
      status TEXT DEFAULT 'Available'
    );

    CREATE TABLE IF NOT EXISTS webhooks_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp     TEXT DEFAULT (datetime('now')),
      call_id       TEXT,
      status        TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      user_type  TEXT DEFAULT 'admin',
      driver_id  INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      phone      TEXT,
      email      TEXT,
      notes      TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id  INTEGER NOT NULL,
      driver_id       INTEGER,
      token           TEXT UNIQUE NOT NULL,
      client_name     TEXT NOT NULL,
      client_phone    TEXT,
      driver_name     TEXT,
      rating          INTEGER,
      comment         TEXT,
      tip_amount      REAL DEFAULT 0,
      submitted       INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      submitted_at    TEXT,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );

    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id  INTEGER NOT NULL,
      token           TEXT UNIQUE NOT NULL,
      created_at      TEXT DEFAULT (datetime('now')),
      expires_at      TEXT NOT NULL,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    );

    CREATE TABLE IF NOT EXISTS driver_locations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id       INTEGER NOT NULL,
      latitude        REAL NOT NULL,
      longitude       REAL NOT NULL,
      accuracy        REAL,
      bearing         REAL,
      speed           REAL,
      timestamp       TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );
  `);

  // Safe column migrations — silently ignored if already exist
  const migrate = (sql) => { try { db.exec(sql); } catch {} };
  migrate('ALTER TABLE reservations ADD COLUMN luggage_count INTEGER DEFAULT 0');
  migrate('ALTER TABLE reservations ADD COLUMN flight_number TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN flight_data   TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN is_company INTEGER DEFAULT 0');
  migrate('ALTER TABLE reservations ADD COLUMN company_name TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN card_type TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN card_number TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN card_expiry TEXT');
  migrate('ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT "admin"');
  migrate('ALTER TABLE users ADD COLUMN driver_id INTEGER');
  migrate('ALTER TABLE drivers ADD COLUMN license_id TEXT');
  migrate('ALTER TABLE drivers ADD COLUMN average_rating REAL DEFAULT 0');
  migrate('ALTER TABLE drivers ADD COLUMN total_reviews INTEGER DEFAULT 0');
  migrate('ALTER TABLE drivers ADD COLUMN total_tips REAL DEFAULT 0');
  migrate('ALTER TABLE reviews ADD COLUMN driver_id INTEGER');
  migrate('ALTER TABLE reviews ADD COLUMN tip_amount REAL DEFAULT 0');
  migrate('ALTER TABLE reservations ADD COLUMN tip_amount REAL DEFAULT 0');
  migrate('ALTER TABLE reservations ADD COLUMN trip_start_time TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN trip_end_time TEXT');
  migrate('ALTER TABLE reservations ADD COLUMN total_distance REAL DEFAULT 0');

  seedData();
  seedAdmin();
  seedCustomers();
}

function generateBookingId() {
  const year = new Date().getFullYear();
  const row  = db
    .prepare(`SELECT booking_id FROM reservations WHERE booking_id LIKE ? ORDER BY id DESC LIMIT 1`)
    .get(`CJ-${year}-%`);
  const next = row ? parseInt(row.booking_id.split('-')[2]) + 1 : 1;
  return `CJ-${year}-${String(next).padStart(3, '0')}`;
}

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM reservations').get();
  if (count.cnt > 0) return;

  const insertDriver = db.prepare('INSERT INTO drivers (name, phone, vehicle, status, license_id, average_rating, total_reviews, total_tips) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertDriver.run('Marcus Williams', '(305) 555-0101', 'Lincoln Navigator', 'Available', 'CJD-001', 5, 2, 70);
  insertDriver.run('Sofia Reyes',     '(305) 555-0102', 'Cadillac Escalade', 'On Run', 'CJD-002', 4.8, 5, 125);
  insertDriver.run('James Carter',    '(305) 555-0103', 'Mercedes S-Class',  'Available', 'CJD-003', 4.9, 3, 95);

  const insertRes = db.prepare(`
    INSERT INTO reservations
      (booking_id, client_name, client_phone, client_email, pickup_datetime,
       pickup_address, dropoff_address, vehicle_assigned, driver_assigned,
       passenger_count, status, source, trip_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  today.setSeconds(0, 0);
  const year = today.getFullYear();

  const t1 = new Date(today); t1.setHours(9, 0);
  const t2 = new Date(today); t2.setHours(14, 30);
  const t3 = new Date(today); t3.setHours(18, 0);
  const t4 = addDays(today, 2); t4.setHours(10, 0);
  const t5 = addDays(today, 5); t5.setHours(16, 30);

  insertRes.run(`CJ-${year}-001`, 'Alexandra Donovan', '(305) 555-2001', 'adonovan@email.com',
    fmtDt(t1), 'Four Seasons Miami, 1435 Brickell Ave, Miami, FL',
    'Miami International Airport, Miami, FL',
    'Lincoln Navigator', 'Marcus Williams', 2, 'Confirmed', 'Manual',
    'VIP client — champagne on arrival');

  insertRes.run(`CJ-${year}-002`, 'Robert Kessler', '(305) 555-2002', 'rkessler@corp.com',
    fmtDt(t2), 'Miami International Airport Terminal D',
    'Fontainebleau Miami Beach, 4441 Collins Ave',
    'Cadillac Escalade', 'Sofia Reyes', 1, 'En Route', 'AI Phone Agent',
    'Flight AA 1247 arriving 2:00 PM');

  insertRes.run(`CJ-${year}-003`, 'Isabella Marquez', '(786) 555-3003', 'imarquez@luxury.net',
    fmtDt(t3), 'Brickell City Centre, 701 S Miami Ave',
    'Hard Rock Stadium, Miami Gardens, FL',
    'Mercedes S-Class', 'James Carter', 4, 'Pending', 'Manual',
    'Concert tonight — VIP entrance gate 3');

  insertRes.run(`CJ-${year}-004`, 'Thomas Beaumont', '(954) 555-4004', 'tbeaumont@wealth.com',
    fmtDt(t4), 'Fort Lauderdale Executive Airport',
    'The Breakers Palm Beach, 1 S County Rd',
    'Lincoln Navigator', 'Marcus Williams', 3, 'Confirmed', 'AI Phone Agent', null);

  insertRes.run(`CJ-${year}-005`, 'Natalie Chen', '(305) 555-5005', 'nchen@ventures.io',
    fmtDt(t5), 'Bal Harbour Shops, 9700 Collins Ave',
    'Port of Miami, Terminal J',
    'Cadillac Escalade', null, 2, 'Pending', 'Manual',
    'Cruise ship departure — arrive 2 hours early');
}

function seedCustomers() {
  const exists = db.prepare('SELECT COUNT(*) as cnt FROM customers').get();
  if (exists.cnt > 0) return;
  const insert = db.prepare('INSERT INTO customers (name, phone, email, notes) VALUES (?, ?, ?, ?)');
  insert.run('Alexandra Donovan', '(305) 555-2001', 'adonovan@email.com', 'VIP client');
  insert.run('Robert Kessler',    '(305) 555-2002', 'rkessler@corp.com',   null);
  insert.run('Isabella Marquez',  '(786) 555-3003', 'imarquez@luxury.net', null);
  insert.run('Thomas Beaumont',   '(954) 555-4004', 'tbeaumont@wealth.com', null);
  insert.run('Natalie Chen',      '(305) 555-5005', 'nchen@ventures.io',   'Frequent traveler');
}

function seedAdmin() {
  const adminExists = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE user_type = ?').get('admin');
  if (adminExists.cnt === 0) {
    const adminHash = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO users (username, password, user_type) VALUES (?, ?, ?)').run('admin', adminHash, 'admin');
  }

  const driverHash = bcrypt.hashSync('driver', 10);
  const drivers = db.prepare('SELECT id FROM drivers ORDER BY id').all();

  drivers.forEach((driver) => {
    const driverUsername = `driver${driver.id}`;
    const exists = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE username = ?').get(driverUsername);
    if (exists.cnt === 0) {
      db.prepare('INSERT INTO users (username, password, user_type, driver_id) VALUES (?, ?, ?, ?)').run(
        driverUsername, driverHash, 'driver', driver.id
      );
    }
  });
}

module.exports = { db, initDb, generateBookingId };
