// Integration tests for all backend endpoints in index.js
// Uses supertest to test the Express app
const request = require('supertest');
const { pool } = require('../db.cjs');
const app = require('../index.cjs');

describe('Backend API endpoints', () => {
  /**
   * Tests GET /api/events
   */
  it('GET /api/events returns all events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /**
   * Tests POST /api/votes and GET /api/votes
   */
  it('POST /api/votes and GET /api/votes work as expected', async () => {
    // Insert a test event
    const eventRes = await pool.query("INSERT INTO events (title, date, address) VALUES ('API Test', '2025-07-10', 'Test City') RETURNING id");
    const eventId = eventRes.rows[0].id;
    const userId = 'apitestuser';
    // Vote exists
    let res = await request(app).post('/api/votes').send({ event_id: eventId, type: 'exists', user_id: userId });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Get votes
    res = await request(app).get(`/api/votes?event_id=${eventId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Clean up
    await pool.query('DELETE FROM votes WHERE event_id = $1', [eventId]);
    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
  });

  /**
   * Tests GET /api/health
   */
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
