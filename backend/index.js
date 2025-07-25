// index.js - Main entry for Salsa Event Finder backend
// Express server with PostgreSQL for persistent event and vote storage
// All endpoints and logic are fully documented

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool, initDb, voteEvent } = require('./db.cjs');
const { collectSalsaEvents } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 4000;

// Restrict CORS in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-frontend-domain.com']
  : undefined;
app.use(cors({ origin: allowedOrigins || true }));

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
    console.error('Error fetching events:', err);
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

/**
 * GET /api/events/search?city=CityName&date=YYYY-MM-DD
 * Returns events filtered by city and optionally by date (case-insensitive, safe from injection).
 */
app.get('/api/events/search', async (req, res) => {
  const { city, date } = req.query;
  if (!city || typeof city !== 'string') {
    return res.status(400).json({ error: 'City is required' });
  }
  // Allow only letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(city.trim())) {
    return res.status(400).json({ error: 'Invalid city name' });
  }
  
  try {
    let query = 'SELECT *, venue_type AS "venueType" FROM events WHERE LOWER(city) = LOWER($1)';
    let params = [city.trim()];
    
    // Add date filter if provided
    if (date && typeof date === 'string') {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      query += ' AND date = $2';
      params.push(date);
    }
    
    query += ' ORDER BY date ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/venue-votes
 * Body: { event_id, type, user_id }
 * Handles venue type voting logic: toggles or switches vote, returns updated counters.
 */
app.post('/api/venue-votes', async (req, res) => {
  const { event_id, type, user_id } = req.body;
  if (!event_id || !['indoor','outdoor'].includes(type) || !user_id) {
    return res.status(400).json({ error: 'Invalid venue vote data' });
  }
  try {
    const counts = await require('./db.cjs').venueVoteEvent(event_id, type, user_id);
    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/venue-votes?event_id=123
 * Returns all venue votes for a given event.
 */
app.get('/api/venue-votes', async (req, res) => {
  const { event_id } = req.query;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });
  try {
    const result = await pool.query('SELECT * FROM venue_votes WHERE event_id = $1', [event_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scrape-events?city=CityName&date=YYYY-MM-DD&styles=...
 * Triggers Google search, scraping, and LLM extraction for new events.
 * Returns status only (results are fetched from DB).
 */
app.get('/api/scrape-events', async (req, res) => {
  const { city, date } = req.query;
  if (!city || typeof city !== 'string') {
    return res.status(400).json({ error: 'City is required' });
  }
  let weekday = '';
  if (date) {
    try {
      const d = new Date(date);
      const weekdays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
      weekday = weekdays[d.getDay()];
    } catch {}
  }
  try {
    const status = { steps: [] };
    // Wrap collectSalsaEvents to collect stepwise status
    await require('./scraper').collectSalsaEvents(city, date, weekday, status);
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/events/group/:eventId
 * Returns all date instances for a specific event (including linked events with same original_event_id).
 */
app.get('/api/events/group/:eventId', async (req, res) => {
  const { eventId } = req.params;
  if (!eventId || isNaN(eventId)) {
    return res.status(400).json({ error: 'Valid event ID is required' });
  }
  
  try {
    // First, get the event to find its original_event_id or use itself as original
    const eventResult = await pool.query(
      'SELECT id, original_event_id FROM events WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = eventResult.rows[0];
    const originalId = event.original_event_id || event.id;
    
    // Get all events that are part of this group
    const result = await pool.query(`
      SELECT *, venue_type AS "venueType" FROM events 
      WHERE (id = $1 OR original_event_id = $1) 
      ORDER BY date ASC
    `, [originalId]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Salsa Event Finder backend running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
