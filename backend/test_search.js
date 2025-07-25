const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testSearch() {
  try {
    // Test search like the frontend would do
    const city = 'Dresden'; // The city from your error log
    const date = '2025-07-25'; // Today's date
    
    console.log(`Testing search for city="${city}" and date="${date}"`);
    
    // This is the same query used in /api/events/search
    const result = await pool.query(
      'SELECT *, venue_type AS "venueType" FROM events WHERE LOWER(city) = LOWER($1) AND date = $2 ORDER BY date ASC',
      [city, date]
    );
    
    console.log(`Found ${result.rows.length} existing events for ${city} on ${date}`);
    
    if (result.rows.length > 0) {
      result.rows.forEach(event => {
        console.log(`- [${event.id}] ${event.title} on ${event.date}`);
      });
    } else {
      console.log('No existing events found - that explains why only new scraped events appear!');
      
      // Let's check what dates exist for Dresden
      const dresdenResult = await pool.query(
        'SELECT date, COUNT(*) as count FROM events WHERE LOWER(city) = LOWER($1) GROUP BY date ORDER BY date DESC LIMIT 10',
        [city]
      );
      
      console.log(`\nAll dates with events in ${city}:`);
      dresdenResult.rows.forEach(row => {
        console.log(`- ${row.date}: ${row.count} events`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();
