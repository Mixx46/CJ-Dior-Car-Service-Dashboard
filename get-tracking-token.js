#!/usr/bin/env node

const { db } = require('./server/db');

try {
  const session = db.prepare(`
    SELECT id, token, reservation_id, created_at, expires_at
    FROM tracking_sessions
    ORDER BY created_at DESC LIMIT 1
  `).get();

  if (!session) {
    console.log('\n❌ No tracking sessions found!\n');
    console.log('To create one:');
    console.log('  1. Login as admin');
    console.log('  2. Go to "Today\'s Runs"');
    console.log('  3. Change a reservation status to "En Route"');
    console.log('  4. Run this script again\n');
    process.exit(1);
  }

  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  const isExpired = expiresAt < now;

  console.log('\n✅ Tracking Session Found!\n');
  console.log('────────────────────────────────────────');
  console.log(`Token:           ${session.token}`);
  console.log(`Reservation ID:  ${session.reservation_id}`);
  console.log(`Created:         ${new Date(session.created_at).toLocaleString()}`);
  console.log(`Expires:         ${expiresAt.toLocaleString()}`);
  console.log(`Status:          ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
  console.log('────────────────────────────────────────\n');

  console.log('📍 Tracking Link:\n');
  console.log(`http://localhost:5173/track/${session.token}\n`);

  console.log('Or paste this into your browser:\n');
  console.log(`localhost:5173/track/${session.token}\n`);

  // Also list all active sessions
  const allSessions = db.prepare(`
    SELECT id, reservation_id, token, created_at, expires_at
    FROM tracking_sessions
    WHERE expires_at > datetime('now')
    ORDER BY created_at DESC
  `).all();

  if (allSessions.length > 1) {
    console.log(`📋 Other Valid Sessions (${allSessions.length} total):\n`);
    allSessions.forEach((s, i) => {
      console.log(`  ${i + 1}. Reservation #${s.reservation_id} - ${s.token.substring(0, 20)}...`);
    });
    console.log('');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nMake sure:');
  console.error('  - You\'re in the cj-dior-car-service directory');
  console.error('  - Database file exists: data/cjdior.db');
  console.error('  - You have at least one reservation with status "En Route"\n');
  process.exit(1);
}
