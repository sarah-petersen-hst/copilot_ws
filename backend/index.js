// index.js - Main entry for Salsa Event Finder backend
// Express server with PostgreSQL for persistent event and vote storage
// All endpoints and logic are fully documented

import express from 'express';
import cors from 'cors';
import { pool, initDb, voteEvent } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize PostgreSQL schema
initDb().then(() => {
  console.log('Database initialized');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api/events
 * Returns all events with their details.
 */
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/votes
 * Body: { event_id, type, user_id }
 * Handles voting logic: toggles or switches vote, returns updated counters.
 */
app.post('/api/votes', async (req, res) => {
  const { event_id, type, user_id } = req.body;
  if (!event_id || !['exists','notexists'].includes(type) || !user_id) {
    return res.status(400).json({ error: 'Invalid vote data' });
  }
  try {
    const counts = await voteEvent(event_id, type, user_id);
    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/votes?event_id=123
 * Returns all votes for a given event.
 */
app.get('/api/votes', async (req, res) => {
  const { event_id } = req.query;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });
  try {
    const result = await pool.query('SELECT * FROM votes WHERE event_id = $1', [event_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Salsa Event Finder backend running on port ${PORT}`);
});
