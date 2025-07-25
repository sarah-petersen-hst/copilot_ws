const { pool } = require('./db');

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name IN ('recurring_pattern', 'recurrence')
      ORDER BY column_name
    `);
    
    console.log('Recurrence columns found:');
    result.rows.forEach(row => console.log('- ' + row.column_name));
    
    if (result.rows.length === 0) {
      console.log('❌ No recurrence columns found!');
    } else {
      console.log('✅ Recurrence columns exist');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkColumns();
