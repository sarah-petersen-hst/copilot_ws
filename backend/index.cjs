// index.js - Main entry for Salsa Event Finder backend
// Express server with PostgreSQL for persistent event and vote storage
// All endpoints and logic are fully documented

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool, initDb, voteEvent } = require('./db.cjs');

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS with secure defaults
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.FRONTEND_DOMAIN ? [process.env.FRONTEND_DOMAIN] : [])
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']; // Common React dev ports
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

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
    const result = await pool.query('SELECT *, venuetype AS "venueType" FROM events ORDER BY date ASC');
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

/**
 * GET /api/events/search?city=CityName
 * Returns events filtered by city (case-insensitive, safe from injection).
 */
app.get('/api/events/search', async (req, res) => {
  const { city } = req.query;
  if (!city || typeof city !== 'string') {
    return res.status(400).json({ error: 'City is required' });
  }
  // Allow only letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(city.trim())) {
    return res.status(400).json({ error: 'Invalid city name' });
  }
  try {
    const result = await pool.query(
      'SELECT *, venuetype AS "venueType" FROM events WHERE LOWER(address) LIKE LOWER($1) ORDER BY date ASC',
      [`%${city.trim()}%`]
    );
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

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Salsa Event Finder backend running on port ${PORT}`);
  });
}

module.exports = app;
