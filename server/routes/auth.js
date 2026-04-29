const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'cjdior-dispatch-secret-key';

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, user_type: user.user_type, driver_id: user.driver_id },
    SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, username: user.username, user_type: user.user_type });
});

router.post('/change-username', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  let payload;
  try { payload = jwt.verify(auth.slice(7), SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  const { newUsername } = req.body || {};
  if (!newUsername || !newUsername.trim()) {
    return res.status(400).json({ error: 'New username is required' });
  }
  if (newUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername.trim(), payload.id);
  if (existing) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername.trim(), payload.id);
  res.json({ ok: true });
});

router.post('/change-password', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  let payload;
  try { payload = jwt.verify(auth.slice(7), SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(auth.slice(7), SECRET);
    const response = { id: payload.id, username: payload.username, user_type: payload.user_type };

    if (payload.user_type === 'driver' && payload.driver_id) {
      const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(payload.driver_id);
      if (driver) {
        response.driver = driver;
      }
    }

    res.json(response);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/forgot-password', (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    user.id,
    token,
    expiresAt.toISOString()
  );

  res.json({ token, message: 'Reset token generated. Token expires in 1 hour.' });
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
  if (!reset) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  if (new Date(reset.expires_at) < new Date()) {
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(reset.id);
    return res.status(400).json({ error: 'Token has expired' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, reset.user_id);
  db.prepare('DELETE FROM password_resets WHERE id = ?').run(reset.id);

  res.json({ ok: true, message: 'Password reset successfully' });
});

module.exports = router;
