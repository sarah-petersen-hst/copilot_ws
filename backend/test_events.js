const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkEvents() {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as count FROM events');
    console.log('Total events in database:', countResult.rows[0].count);
    
    const sampleResult = await pool.query('SELECT id, title, date, city, address FROM events ORDER BY id DESC LIMIT 5');
    console.log('\nSample events:');
    sampleResult.rows.forEach(event => {
      console.log(`- [${event.id}] ${event.title}`);
      console.log(`  Date: ${event.date}, City: ${event.city || 'NULL'}`);
      console.log(`  Address: ${event.address || 'NULL'}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEvents();
