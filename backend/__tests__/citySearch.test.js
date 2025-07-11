// Unit tests for backend city search endpoint and validation
// Uses supertest to test the Express app

const request = require('supertest');
const { pool } = require('../db.cjs');
const app = require('../index.cjs');

/**
 * Mocks and tests for /api/events/search endpoint
 * Ensures input validation and parameterized query are enforced
 */
describe('GET /api/events/search', () => {
  it('rejects missing city parameter', async () => {
    const res = await request(app).get('/api/events/search');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/city is required/i);
  });

  it('rejects invalid city names', async () => {
    const res = await request(app).get('/api/events/search?city=Berlin123');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid city name/i);
  });

  it('accepts valid city names and returns events', async () => {
    // Insert a test event
    await pool.query("INSERT INTO events (title, date, address) VALUES ('Test Event', '2025-07-10', 'Berlin')");
    const res = await request(app).get('/api/events/search?city=Berlin');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Clean up
    await pool.query("DELETE FROM events WHERE title = 'Test Event'");
  });
});
