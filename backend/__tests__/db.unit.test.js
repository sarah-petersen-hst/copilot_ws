// Unit tests for backend/db.js utility functions
// Uses Jest and a test database connection
const { pool, initDb, voteEvent } = require('../db.js');

describe('db.js utility functions', () => {
  /**
   * Tests the initDb function for schema creation.
   */
  it('should initialize the database schema without error', async () => {
    await expect(initDb()).resolves.not.toThrow();
  });

  /**
   * Tests the voteEvent function for correct voting logic.
   */
  it('should insert, update, and remove votes correctly', async () => {
    // Insert a test event
    const eventRes = await pool.query("INSERT INTO events (title, date, address) VALUES ('Vote Test', '2025-07-10', 'Test City') RETURNING id");
    const eventId = eventRes.rows[0].id;
    const userId = 'testuser123';
    // Insert vote
    let counts = await voteEvent(eventId, 'exists', userId);
    expect(counts.exists).toBeGreaterThanOrEqual(1);
    // Switch vote
    counts = await voteEvent(eventId, 'notexists', userId);
    expect(counts.notexists).toBeGreaterThanOrEqual(1);
    // Withdraw vote
    counts = await voteEvent(eventId, 'notexists', userId);
    // Clean up
    await pool.query('DELETE FROM votes WHERE event_id = $1', [eventId]);
    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
  });
});
