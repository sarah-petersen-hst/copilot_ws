// Utility for initializing the PostgreSQL database schema
import pkg from 'pg';
const { Pool } = pkg;

// Connection pool for PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:D3vTjQoy@localhost:5432/danceevents',
});

/**
 * Initializes the database schema for events and votes tables if not present.
 * Call this once at server startup.
 */
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      address TEXT,
      source TEXT,
      trusted BOOLEAN DEFAULT FALSE,
      workshops JSONB,
      party JSONB
    );
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      type TEXT CHECK(type IN ('exists','notexists')) NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT
    );
  `);
}
