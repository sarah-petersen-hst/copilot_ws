// Test case for scraping https://cumbancha.de/salsa-berlin-so-tanzt-du-durch-die-hauptstadt/
// This test scrapes the website directly and logs all database column outputs

const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:D3vTjQoy@localhost:5432/danceevents',
});

const TEST_URL = 'https://cumbancha.de/salsa-berlin-so-tanzt-du-durch-die-hauptstadt/';
const USER_AGENT = 'TanzpartyBot/1.0 (+https://deineseite.de/bot-info)';

/**
 * Enhanced Gemini AI extraction specifically for testing
 */
async function extractEventDataWithGemini(content, url, city, date) {
  console.log('🤖 Starting Gemini AI extraction...');
  
  const prompt = `
Please extract salsa dance event information from this webpage content. Focus only on actual events/parties, not courses or workshops unless they lead to a party.

🚨 CRITICAL DATE PARSING RULES:
- German date format: DD.MM.YYYY (FIRST number = DAY, SECOND = MONTH)
- Examples: 20.08.2025 = 2025-08-20 (day=20, month=08)
- 15.12.2024 = 2024-12-15 (day=15, month=12)
- Month names: Januar=01, Februar=02, März=03, April=04, Mai=05, Juni=06, Juli=07, August=08, September=09, Oktober=10, November=11, Dezember=12
- ALWAYS double-check: FIRST number = DAY, SECOND = MONTH

⏰ TIME EXTRACTION:
- Only extract actual times found in content (like "20:00", "ab 19:00")
- Use null when no specific time is mentioned
- NEVER guess "20:00" as default

🔄 RECURRING PATTERN STANDARDIZATION:
- "alle zwei Wochen", "zweiwöchentlich" → "biweekly"
- "wöchentlich", "jeden Montag", "jeden Dienstag", etc. → "weekly_monday", "weekly_tuesday", etc.
- "monatlich", "jeden ersten Freitag" → "monthly"
- If pattern mentions specific weekday, include it: "weekly_monday", "weekly_friday"

🏙️ CITY EXTRACTION:
Extract only the city name from venue_address for the city field. Examples:
- "Musterstraße 123, 10115 Berlin" → city: "Berlin"
- "Venloer Str. 1031, 50829 Köln" → city: "Köln"

🏢 VENUE TYPE DETECTION:
- Indoor: default for clubs, bars, restaurants, studios
- Outdoor: "Open Air", "bei gutem Wetter", "Innenhof", "Garten", "Park", "Strand"
- Unspecified: when unclear

✅ CONTENT FILTERING:
Only extract events that are actual dance parties/socials. Skip pure courses/workshops unless they mention a party afterward.

🗓️ MULTIPLE DATES:
If event has multiple specific dates, extract all dates in multiple_dates array.

🎵 DANCE STYLES:
Common styles: Salsa (Cuban/LA/NY), Bachata (Dominican/Sensual), Kizomba, Zouk, Merengue, Cha-Cha-Cha

Return a JSON object with this exact structure:
{
  "events": [
    {
      "title": "Event Title",
      "dance_styles": ["Salsa", "Bachata"],
      "date": "YYYY-MM-DD",
      "time": "HH:MM" or null,
      "venue_name": "Venue Name",
      "venue_address": "Full Address",
      "city": "City Name Only",
      "venue_type": "Indoor/Outdoor/Unspecified",
      "workshop_date": "YYYY-MM-DD" or null,
      "workshop_time": "HH:MM" or null,
      "party_date": "YYYY-MM-DD" or null,
      "party_time": "HH:MM" or null,
      "workshops": [{"start": "HH:MM", "end": "HH:MM", "style": "Salsa", "level": "Beginner"}] or [],
      "party": {"start": "HH:MM", "end": "HH:MM" or null, "floors": [{"floor": "1", "distribution": "60% Salsa, 40% Bachata"}]} or {},
      "description": "Brief description",
      "recurring_pattern": "weekly_monday" or "biweekly" or null,
      "multiple_dates": ["YYYY-MM-DD", "YYYY-MM-DD"] or null,
      "source_url": "${url}"
    }
  ]
}

Webpage content:
${content}

Search parameters:
- City: ${city}
- Date: ${date}
- URL: ${url}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();
    
    console.log('🔍 Raw Gemini response:');
    console.log(text);
    
    // Clean up response - remove markdown code blocks if present
    text = text.replace(/```json\s*|\s*```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Raw text that failed to parse:', text);
      return [];
    }
    
    if (!parsed.events || !Array.isArray(parsed.events)) {
      console.log('⚠️ No events found in response');
      return [];
    }
    
    console.log(`✅ Gemini extracted ${parsed.events.length} events`);
    return parsed.events;
    
  } catch (error) {
    console.error('❌ Gemini AI error:', error.message);
    return [];
  }
}

/**
 * Scrape webpage content
 */
async function scrapePage(url) {
  console.log(`🌐 Scraping: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .menu, .navigation, .sidebar').remove();
    
    // Extract main content
    let content = $('main, .content, .main-content, article, .post, .entry, body').first().text() || $('body').text();
    
    // Clean up text
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Limit content size
    if (content.length > 8000) {
      content = content.substring(0, 8000) + '...';
    }
    
    console.log(`📄 Content extracted: ${content.length} characters`);
    return content;
    
  } catch (error) {
    console.error(`❌ Scraping error for ${url}:`, error.message);
    return null;
  }
}

/**
 * Log all database columns for an event
 */
function logDatabaseColumns(eventData, index = 0) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 DATABASE COLUMNS OUTPUT - Event ${index + 1}`);
  console.log('='.repeat(80));
  
  // All possible database columns from the schema
  const columns = [
    'id', // Will be auto-generated
    'title',
    'date',
    'time',
    'venue_name',
    'venue_address',
    'city',
    'source_url',
    'dance_styles',
    'venue_type',
    'workshop_date',
    'workshop_time',
    'party_date',
    'party_time',
    'source',
    'timestamp', // Will be auto-generated
    'address',
    'trusted',
    'workshops',
    'party',
    'recurrence',
    'recurring_pattern',
    'original_event_id'
  ];
  
  columns.forEach(column => {
    let value = eventData[column];
    
    // Handle special cases
    if (column === 'id') {
      value = '[AUTO_GENERATED]';
    } else if (column === 'timestamp') {
      value = '[AUTO_GENERATED - NOW()]';
    } else if (column === 'source') {
      value = eventData.source || 'scraped';
    } else if (column === 'address') {
      value = eventData.venue_address || eventData.address;
    } else if (column === 'source_url') {
      value = eventData.source_url || TEST_URL;
    } else if (column === 'trusted') {
      value = eventData.trusted || false;
    } else if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value, null, 2);
    } else if (value === undefined) {
      value = null;
    }
    
    console.log(`${column.padEnd(20)}: ${value}`);
  });
  
  console.log('='.repeat(80));
}

/**
 * Main test function
 */
async function runScrapingTest() {
  console.log('🚀 Starting scraping test for:', TEST_URL);
  console.log('📅 Test Date:', new Date().toISOString());
  
  try {
    // Scrape the webpage
    const content = await scrapePage(TEST_URL);
    
    if (!content) {
      console.error('❌ Failed to scrape content');
      return;
    }
    
    console.log('\n📋 Scraped Content Preview:');
    console.log(content.substring(0, 500) + '...\n');
    
    // Extract events with Gemini AI
    const events = await extractEventDataWithGemini(content, TEST_URL, 'Berlin', '2025-08-04');
    
    if (events.length === 0) {
      console.log('❌ No events extracted');
      return;
    }
    
    console.log(`\n✅ Successfully extracted ${events.length} event(s)`);
    
    // Log database columns for each event
    events.forEach((event, index) => {
      logDatabaseColumns(event, index);
    });
    
    // Optionally, show what would be inserted into database
    console.log('\n🗄️ SQL INSERT PREVIEW:');
    events.forEach((event, index) => {
      console.log(`\n-- Event ${index + 1}: ${event.title}`);
      console.log(`INSERT INTO events (title, date, time, venue_name, venue_address, city, source_url, dance_styles, venue_type, workshop_date, workshop_time, party_date, party_time, source, address, trusted, workshops, party, recurrence, recurring_pattern, original_event_id)`);
      console.log(`VALUES (`);
      console.log(`  '${event.title || ''}',`);
      console.log(`  '${event.date || ''}',`);
      console.log(`  '${event.time || ''}',`);
      console.log(`  '${event.venue_name || ''}',`);
      console.log(`  '${event.venue_address || ''}',`);
      console.log(`  '${event.city || 'Berlin'}',`);
      console.log(`  '${event.source_url || TEST_URL}',`);
      console.log(`  '${JSON.stringify(event.dance_styles || [])}',`);
      console.log(`  '${event.venue_type || 'Unspecified'}',`);
      console.log(`  ${event.workshop_date ? `'${event.workshop_date}'` : 'NULL'},`);
      console.log(`  ${event.workshop_time ? `'${event.workshop_time}'` : 'NULL'},`);
      console.log(`  ${event.party_date ? `'${event.party_date}'` : 'NULL'},`);
      console.log(`  ${event.party_time ? `'${event.party_time}'` : 'NULL'},`);
      console.log(`  'scraped',`);
      console.log(`  '${event.venue_address || event.address || ''}',`);
      console.log(`  ${event.trusted || false},`);
      console.log(`  ${event.workshops ? `'${JSON.stringify(event.workshops)}'` : 'NULL'},`);
      console.log(`  ${event.party ? `'${JSON.stringify(event.party)}'` : 'NULL'},`);
      console.log(`  ${event.recurrence ? `'${event.recurrence}'` : 'NULL'},`);
      console.log(`  ${event.recurring_pattern ? `'${event.recurring_pattern}'` : 'NULL'},`);
      console.log(`  ${event.original_event_id || 'NULL'}`);
      console.log(`);`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  runScrapingTest();
}

module.exports = { runScrapingTest };
