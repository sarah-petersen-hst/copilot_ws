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
      address TEXT NOT NULL,
      source TEXT NOT NULL,
      dance_styles JSONB,
      venue_type TEXT DEFAULT 'Unspecified',
      workshop_date TEXT,
      workshop_time TEXT,
      party_date TEXT,
      party_time TEXT,
      timestamp TIMESTAMP DEFAULT NOW(),
      trusted BOOLEAN DEFAULT FALSE,
      workshops JSONB,
      party JSONB,
      recurrence TEXT
    );
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      type TEXT CHECK(type IN ('exists','notexists')) NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT
    );
    CREATE TABLE IF NOT EXISTS venue_votes (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      type TEXT CHECK(type IN ('indoor','outdoor')) NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT
    );
  `);

  // Update existing NULL values before adding NOT NULL constraints
  await pool.query(`UPDATE events SET address = 'Location TBD' WHERE address IS NULL;`);
  await pool.query(`UPDATE events SET source = 'No source available' WHERE source IS NULL;`);

  // Add NOT NULL constraints to existing columns if they don't have them
  try {
    await pool.query(`ALTER TABLE events ALTER COLUMN address SET NOT NULL;`);
    console.log('Added NOT NULL constraint to address column');
  } catch (err) {
    console.log('Note: address column may already have NOT NULL constraint');
  }

  try {
    await pool.query(`ALTER TABLE events ALTER COLUMN source SET NOT NULL;`);
    console.log('Added NOT NULL constraint to source column');
  } catch (err) {
    console.log('Note: source column may already have NOT NULL constraint');
  }

  // Clean up old columns if they exist
  try {
    await pool.query(`ALTER TABLE events DROP COLUMN IF EXISTS source_url;`);
    await pool.query(`ALTER TABLE events DROP COLUMN IF EXISTS venue_address;`);
    await pool.query(`ALTER TABLE events DROP COLUMN IF EXISTS venueType;`);
    console.log('Database schema updated and old columns removed');
  } catch (err) {
    console.log('Note: Some columns may not have existed to drop:', err.message);
  }

  console.log('Database initialized successfully');
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

/**
 * Handles venue type voting logic: each user can only have one venue vote per event.
 * If user votes again, their previous vote is updated to the new type and date (current week).
 * If user votes the same type, their vote is withdrawn.
 * Returns updated vote counts for both types (all time) and for the current week.
 * @param {number} event_id
 * @param {string} type - 'indoor' or 'outdoor'
 * @param {string} user_id
 * @returns {Promise<{indoor: number, outdoor: number, weekIndoor: number, weekOutdoor: number}>}
 */
async function venueVoteEvent(event_id, type, user_id) {
  if (!['indoor', 'outdoor'].includes(type)) throw new Error('Invalid venue vote type');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check if user already voted for this event's venue
    const { rows } = await client.query(
      'SELECT id FROM venue_votes WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );
    if (rows.length > 0) {
      // If user clicks the same type as their current vote, remove the vote (withdraw)
      const currentVote = await client.query(
        'SELECT type FROM venue_votes WHERE id = $1', [rows[0].id]
      );
      if (currentVote.rows[0].type === type) {
        await client.query('DELETE FROM venue_votes WHERE id = $1', [rows[0].id]);
      } else {
        // Otherwise, update the vote to the new type and date (current week)
        await client.query(
          'UPDATE venue_votes SET type = $1, date = $2 WHERE id = $3',
          [type, new Date().toISOString(), rows[0].id]
        );
      }
    } else {
      // Insert new vote
      await client.query(
        'INSERT INTO venue_votes (event_id, type, date, user_id) VALUES ($1, $2, $3, $4)',
        [event_id, type, new Date().toISOString(), user_id]
      );
    }
    // Get updated total counters
    const countRes = await client.query(
      `SELECT type, COUNT(*) as count FROM venue_votes WHERE event_id = $1 GROUP BY type`,
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
      `SELECT type, COUNT(*) as count FROM venue_votes WHERE event_id = $1 AND date >= $2 AND date < $3 GROUP BY type`,
      [event_id, startOfWeek.toISOString(), endOfWeek.toISOString()]
    );
    await client.query('COMMIT');
    // Format result
    const counts = { indoor: 0, outdoor: 0, weekIndoor: 0, weekOutdoor: 0 };
    for (const row of countRes.rows) {
      counts[row.type] = parseInt(row.count, 10);
    }
    for (const row of weekRes.rows) {
      if (row.type === 'indoor') counts.weekIndoor = parseInt(row.count, 10);
      if (row.type === 'outdoor') counts.weekOutdoor = parseInt(row.count, 10);
    }
    return counts;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb, voteEvent, venueVoteEvent };
