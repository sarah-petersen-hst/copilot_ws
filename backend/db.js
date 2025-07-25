// Utility for initializing the PostgreSQL database schema
const pkg = require('pg');
const { Pool } = pkg;

// Connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:D3vTjQoy@localhost:5432/danceevents',
});

/**
 * Initializes the database schema for events and votes tables if not present.
 * Call this once at server startup.
 */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT DEFAULT '20:00',
      venue_name TEXT,
      venue_address TEXT,
      city TEXT NOT NULL,
      source_url TEXT,
      dance_styles JSONB,
      venue_type TEXT DEFAULT 'Unspecified',
      workshop_date TEXT,
      workshop_time TEXT,
      party_date TEXT,
      party_time TEXT,
      source TEXT DEFAULT 'scraped',
      timestamp TIMESTAMP DEFAULT NOW(),
      address TEXT,
      trusted BOOLEAN DEFAULT FALSE,
      workshops JSONB,
      party JSONB,
      recurrence TEXT,
      recurring_pattern TEXT,
      original_event_id INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS event_dates (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      event_date DATE NOT NULL,
      event_time TIME,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(event_id, event_date)
    );
    
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      type TEXT CHECK(type IN ('exists','notexists')) NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT
    );
    
    CREATE TABLE IF NOT EXISTS scraped_urls (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      scraped_at TIMESTAMP DEFAULT NOW(),
      success BOOLEAN DEFAULT FALSE,
      events_count INTEGER DEFAULT 0,
      last_scraped TIMESTAMP DEFAULT NOW()
    );
    
    -- Add missing columns if they don't exist
    ALTER TABLE events ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '20:00';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_address TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS source_url TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS dance_styles JSONB;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_type TEXT DEFAULT 'Unspecified';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS workshop_date TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS workshop_time TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS party_date TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS party_time TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT NOW();
    ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_pattern TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS original_event_id INTEGER;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS venueType TEXT;
  `);
}

/**
 * Handles voting logic: each user can only have one vote per event, always updated to the latest week.
 * If user votes again, their previous vote is updated to the new type and date (current week).
 * Returns updated vote counts for both types (all time) and for the current week.
 * @param {number} event_id
 * @param {string} type - 'exists' or 'notexists'
 * @param {string} user_id
 * @returns {Promise<{exists: number, notexists: number, weekExists: number, weekNotExists: number}>}
 */
async function voteEvent(event_id, type, user_id) {
  if (!['exists', 'notexists'].includes(type)) throw new Error('Invalid vote type');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check if user already voted for this event
    const { rows } = await client.query(
      'SELECT id FROM votes WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );
    if (rows.length > 0) {
      // If user clicks the same type as their current vote, remove the vote (withdraw)
      const currentVote = await client.query(
        'SELECT type FROM votes WHERE id = $1', [rows[0].id]
      );
      if (currentVote.rows[0].type === type) {
        await client.query('DELETE FROM votes WHERE id = $1', [rows[0].id]);
      } else {
        // Otherwise, update the vote to the new type and date (current week)
        await client.query(
          'UPDATE votes SET type = $1, date = $2 WHERE id = $3',
          [type, new Date().toISOString(), rows[0].id]
        );
      }
    } else {
      // Insert new vote
      await client.query(
        'INSERT INTO votes (event_id, type, date, user_id) VALUES ($1, $2, $3, $4)',
        [event_id, type, new Date().toISOString(), user_id]
      );
    }
    // Get updated total counters
    const countRes = await client.query(
      `SELECT type, COUNT(*) as count FROM votes WHERE event_id = $1 GROUP BY type`,
      [event_id]
    );
    // Get current week counters
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1); // Monday
    startOfWeek.setUTCHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);
    const weekRes = await client.query(
      `SELECT type, COUNT(*) as count FROM votes WHERE event_id = $1 AND date >= $2 AND date < $3 GROUP BY type`,
      [event_id, startOfWeek.toISOString(), endOfWeek.toISOString()]
    );
    await client.query('COMMIT');
    // Format result
    const counts = { exists: 0, notexists: 0, weekExists: 0, weekNotExists: 0 };
    for (const row of countRes.rows) {
      counts[row.type] = parseInt(row.count, 10);
    }
    for (const row of weekRes.rows) {
      if (row.type === 'exists') counts.weekExists = parseInt(row.count, 10);
      if (row.type === 'notexists') counts.weekNotExists = parseInt(row.count, 10);
    }
    return counts;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb, voteEvent };
