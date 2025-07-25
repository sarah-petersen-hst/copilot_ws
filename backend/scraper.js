// backend/scraper.js
// Salsa Event Scraper Service - Scrapes Google results and extracts events using Gemini AI
// This service fetches Google search results, scrapes webpage content, and uses Gemini AI to extract event data

const axios = require('axios');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const robotsParser = require('robots-parser');
const cheerio = require('cheerio');
require('dotenv').config();
const fs = require('fs');

const USER_AGENT = 'TanzpartyBot/1.0 (+https://deineseite.de/bot-info)';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Build a Google search query for salsa events in a city on a given date/weekday.
 */
function buildSearchQuery(city, date, weekday, styles = []) {
  // Include dance styles in search query if provided
  let searchTerms = ['Salsa', 'Veranstaltung'];
  
  // Add specific dance styles to search if provided
  if (styles && styles.length > 0) {
    // Add the first style to the search terms (avoid overly long queries)
    searchTerms.push(styles[0]);
  }
  
  // Add weekday and city
  if (weekday) searchTerms.push(weekday);
  searchTerms.push(city);
  searchTerms.push('site:.de');
  
  return searchTerms.join(' ');
}

/**
 * Fetch Google search results using the Custom Search API and extract structured data.
 */
async function fetchGoogleResults(query) {
  try {
    console.log('[DEBUG] Searching Google for:', query);
    console.log('[DEBUG] Using API key:', GOOGLE_API_KEY ? 'Present' : 'Missing');
    console.log('[DEBUG] Using CSE ID:', GOOGLE_CSE_ID);
    
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&num=10&hl=de`;
    console.log('[DEBUG] API URL:', url);
    
    const res = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
    console.log('[DEBUG] API Response status:', res.status);
    console.log('[DEBUG] API Response data:', JSON.stringify(res.data, null, 2));
    
    // Save results to file for debugging
    fs.writeFileSync('scraper_google_response.json', JSON.stringify(res.data, null, 2), 'utf8');
    
    return res.data;
  } catch (err) {
    console.error('[DEBUG] Google API Error:', err.response ? err.response.data : err.message);
    fs.writeFileSync('scraper_google_error.txt', err.response ? JSON.stringify(err.response.data, null, 2) : err.message, 'utf8');
    throw new Error('Google API fetch failed: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
}

/**
 * Extract dance styles from text using pattern matching.
 */
function extractDanceStyles(text) {
  const styles = [];
  const patterns = {
    'Salsa': /\b(salsa|salsatanz)\b/i,
    'Bachata': /\b(bachata|bachatanz)\b/i,
    'Kizomba': /\b(kizomba|kizombatanz)\b/i,
    'Zouk': /\b(zouk|zouktanz)\b/i,
    'Merengue': /\b(merengue|merenguetanz)\b/i,
    'Cha Cha': /\b(cha cha|chacha)\b/i,
    'Mambo': /\b(mambo|mambotanz)\b/i,
    'Reggaeton': /\b(reggaeton|reggaetontanz)\b/i,
    'Son': /\b(son|sontanz)\b/i,
    'Rueda': /\b(rueda|rueda de casino)\b/i,
    'Timba': /\b(timba|timbatanz)\b/i,
    'Cumbia': /\b(cumbia|cumbiatanz)\b/i,
    'Tango': /\b(tango|tangotanz)\b/i,
    'Milonga': /\b(milonga|milongatanz)\b/i,
    'Vals': /\b(vals|valstanz)\b/i,
    'Swing': /\b(swing|swingtanz)\b/i,
    'Lindy Hop': /\b(lindy hop|lindyhop)\b/i,
    'West Coast Swing': /\b(west coast swing|wcs)\b/i,
    'East Coast Swing': /\b(east coast swing|ecs)\b/i,
    'Jive': /\b(jive|jivetanz)\b/i,
    'Boogie Woogie': /\b(boogie woogie|boogie|woogie)\b/i,
    'Blues': /\b(blues|bluestanz)\b/i,
    'Forró': /\b(forró|forrotanz)\b/i,
    'Samba': /\b(samba|sambatanz)\b/i,
    'Bolero': /\b(bolero|bolerotanz)\b/i,
    'Discofox': /\b(discofox|disco fox)\b/i,
    'Hustle': /\b(hustle|hustletanz)\b/i,
    'Paso Doble': /\b(paso doble|pasodoble)\b/i,
    'Quickstep': /\b(quickstep|quicksteptanz)\b/i,
    'Foxtrot': /\b(foxtrot|foxtrott)\b/i,
    'Waltz': /\b(waltz|walzer)\b/i,
    'Rumba': /\b(rumba|rumbatanz)\b/i,
    'Cha-Cha-Cha': /\b(cha-cha-cha|chachacha)\b/i
  };
  
  for (const [style, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      styles.push(style);
    }
  }
  
  return styles.length > 0 ? styles : ['Salsa']; // Default to Salsa
}

/**
 * Format date from various formats to YYYY-MM-DD.
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch (_err) {
    return null;
  }
}

/**
 * Extract time from datetime string.
 */
function extractTime(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toTimeString().split(' ')[0].substring(0, 5);
  } catch (_err) {
    return null;
  }
}

/**
 * Extract venue name from event data and addresses.
 */
function extractVenueName(eventData, addresses) {
  if (eventData.location) return eventData.location;
  if (eventData.venue) return eventData.venue;
  if (addresses && addresses.length > 0) {
    const addr = addresses[0];
    if (addr.name) return addr.name;
    if (addr.streetaddress) return addr.streetaddress;
  }
  return null;
}

/**
 * Extract venue address from address data.
 */
function extractVenueAddress(addresses, city) {
  if (!addresses || addresses.length === 0) return `${city}, Germany`;
  
  const addr = addresses[0];
  const parts = [];
  
  if (addr.streetaddress) parts.push(addr.streetaddress);
  if (addr.postalcode) parts.push(addr.postalcode);
  if (addr.addresslocality) parts.push(addr.addresslocality);
  else if (addr.addressregion) parts.push(addr.addressregion);
  
  if (parts.length === 0) parts.push(city);
  parts.push('Germany');
  
  return parts.join(', ');
}

/**
 * Detect venue type based on description text.
 */
function detectVenueType(description) {
  if (!description) return 'Unspecified';
  
  const text = description.toLowerCase();
  
  // Outdoor indicators
  if (text.includes('open air') || text.includes('draußen') || text.includes('outdoor') || 
      text.includes('garten') || text.includes('terrasse') || text.includes('bei gutem wetter') ||
      text.includes('innenhof') || text.includes('park') || text.includes('strand')) {
    return 'Outdoor';
  }
  
  // Indoor indicators
  if (text.includes('indoor') || text.includes('drinnen') || text.includes('saal') || 
      text.includes('club') || text.includes('bar') || text.includes('restaurant') ||
      text.includes('studio') || text.includes('tanzschule')) {
    return 'Indoor';
  }
  
  return 'Unspecified';
}

/**
 * Check if a URL has been scraped recently (within configurable days).
 */
async function isRecentlyScrapped(url, daysBack = 3) {
  try {
    // Check events table using source column and timestamp
    const { rows } = await pool.query(
      `SELECT 1 FROM events WHERE source = $1 AND timestamp > NOW() - INTERVAL '${daysBack} days'`,
      [url]
    );
    
    return rows.length > 0;
  } catch (err) {
    console.error('Error checking recent scrapes:', err);
    return false;
  }
}

/**
 * Save a URL as scraped (regardless of extraction success) to avoid re-scraping.
 */
async function markUrlAsScraped(url, success = false, eventCount = 0) {
  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scraped_urls (
        id SERIAL PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        scraped_at TIMESTAMP DEFAULT NOW(),
        success BOOLEAN DEFAULT FALSE,
        event_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert or update the URL
    await pool.query(`
      INSERT INTO scraped_urls (url, success, event_count, scraped_at, last_updated)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (url) 
      DO UPDATE SET 
        success = $2,
        event_count = $3,
        last_updated = NOW()
    `, [url, success, eventCount]);
    
    console.log(`Marked URL as scraped: ${url} (success: ${success}, events: ${eventCount})`);
  } catch (err) {
    console.error(`Error marking URL as scraped: ${url}`, err.message);
  }
}

/**
 * Check robots.txt for a given URL and path.
 */
async function isAllowedByRobots(url) {
  try {
    const { origin } = new URL(url);
    const robotsUrl = `${origin}/robots.txt`;
    const res = await axios.get(robotsUrl, { 
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000
    });
    const robots = robotsParser(robotsUrl, res.data);
    return robots.isAllowed(url, USER_AGENT);
  } catch (err) {
    console.log(`Could not fetch robots.txt for ${url}:`, err.message);
    // If robots.txt not found, default to allow
    return true;
  }
}

/**
 * Scrape main content from a webpage.
 */
async function scrapePage(url) {
  try {
    const res = await axios.get(url, { 
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
      maxRedirects: 5
    });
    const $ = cheerio.load(res.data);
    
    // Remove scripts, styles, and other non-content elements
    $('script, style, nav, footer, header, aside, .advertisement, .ad, .cookie, .popup').remove();
    
    // Try to extract main content areas
    let content = '';
    const mainSelectors = [
      'main', 
      '[role="main"]', 
      '.main-content', 
      '.content', 
      '.event-content',
      '.event-details',
      '.event-info',
      'article',
      '.post-content',
      '.entry-content'
    ];
    
    for (const selector of mainSelectors) {
      const mainContent = $(selector);
      if (mainContent.length > 0) {
        content = mainContent.text();
        break;
      }
    }
    
    // If no main content found, get body text
    if (!content) {
      content = $('body').text();
    }
    
    // Clean up the content
    content = content.replace(/\s+/g, ' ').trim();
    
    // Limit content size to avoid token limits
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '...';
    }
    
    return content;
  } catch (err) {
    console.error(`Error scraping ${url}:`, err.message);
    return null;
  }
}

/**
 * Use Gemini AI to extract structured event data from scraped content.
 */
async function extractEventDataWithGemini(content, url, city, date) {
  try {
    const prompt = `
You are a precise date extraction expert. Extract ONLY dance event information from this German webpage content.

Return VALID JSON in this exact format (or {"events": []} if no dance events found):

{
  "events": [
    {
      "title": "Event title",
      "dance_styles": ["Salsa L.A.", "Bachata Sensual", "Kizomba"],
      "date": "YYYY-MM-DD",
      "time": null,
      "venue_name": "Venue name",
      "venue_address": "Full address with city",
      "city": "Köln",
      "venue_type": "Indoor",
      "workshop_date": null,
      "workshop_time": null,
      "party_date": "YYYY-MM-DD",
      "party_time": null,
      "multiple_dates": [
        "2025-04-13",
        "2025-06-15", 
        "2025-08-31"
      ],
      "workshops": [
        {
          "style": "Bachata Sensual",
          "level": "Open Level",
          "start": "20:00",
          "end": "21:00",
          "instructors": "Fernando & Julia"
        }
      ],
      "party": {
        "start": "22:00",
        "end": "03:00",
        "floors": [
          {
            "number": 1,
            "description": "Salsa Cubana, Timba/Son/Rumba with DJ TimbaMo"
          },
          {
            "number": 2,
            "description": "Bachata Party with DJ Bebars"
          }
        ]
      },
      "description": "Brief description",
      "recurring_pattern": null
    }
  ]
}

🚨 CRITICAL DATE PARSING RULES (FOLLOW EXACTLY):
1. DD.MM.YYYY → YYYY-MM-DD: 20.08.2025 = 2025-08-20 (day=20, month=08)
2. DD/MM/YYYY → YYYY-MM-DD: 20/08/2025 = 2025-08-20 (day=20, month=08) 
3. German months: Januar=01, Februar=02, März=03, April=04, Mai=05, Juni=06, Juli=07, August=08, September=09, Oktober=10, November=11, Dezember=12
4. "20. August 2025" = 2025-08-20 (day=20, month=08)
5. For recurring events without specific dates, calculate the NEXT occurrence:
   - "jeden Montag" → find next Monday from ${date}
   - "jeden Dienstag" → find next Tuesday from ${date}
   - etc.
6. For multiple specific dates, use the FIRST/EARLIEST date in the main date field
7. Extract ALL dates found and put them in multiple_dates array (format: YYYY-MM-DD)
8. DOUBLE-CHECK: In DD.MM format, FIRST number is DAY, SECOND is MONTH
9. If no year is mentioned in connection with a specific event, assume the current year. Do not use any year that appears elsewhere on the website unless it is explicitly linked to that particular event.

📅 MULTIPLE DATES EXTRACTION:
- Look for patterns like "13. April, 15. Juni, 31. August, 12. Oktober, 30. November"
- Extract each date and convert to YYYY-MM-DD format
- Put all dates in multiple_dates array: ["2019-04-13", "2019-06-15", "2019-08-31", "2019-10-12", "2019-11-30"]
- Use the earliest date as the main date field
- If only one date found, multiple_dates can be empty array []

⏰ TIME RULES:
- Find actual times like "20:00", "21:30", "ab 19:00"
- If no specific time mentioned, use: null

🕺 DANCE STYLE RULES (ONLY these exact names allowed - use ANY that apply):
"Salsa (undefined style)", "Salsa On 2", "Salsa L.A.", "Salsa Cubana", "Bachata (undefined style)", "Bachata Dominicana", "Bachata Sensual", "Kizomba", "Zouk", "Forró"
- Match content to these exact dance style names
- Use multiple styles if the event includes multiple dances
- If unsure about salsa/bachata subtype, use "Salsa (undefined style)" or "Bachata (undefined style)"

🏢 VENUE TYPE RULES:
- Outdoor: "Open Air", "draußen", "outdoor", "Garten", "Terrasse", "bei gutem Wetter", "Innenhof", "Park", "Strand"
- Indoor: "indoor", "drinnen", "Saal", "Club", "Bar", "Restaurant", "Studio", "Tanzschule"
- Default: "Unspecified"

🎓 WORKSHOP EXTRACTION RULES:
- Extract ALL workshops mentioned with times, dance styles, levels, and instructors
- Include workshop_date and workshop_time for the first/main workshop
- Create workshops array with detailed information for each workshop
- Common levels: "Open Level", "Beginner", "Intermediate", "Advanced", "Mittelstufe", "Anfänger"
- Example: "20:00 Uhr Bachata Workshop Open Level mit Fernando & Julia"

🎉 PARTY EXTRACTION RULES:
- Extract party start/end times and floor information
- Include party_date and party_time for the main party
- Create party object with start, end, and floors array
- Extract DJ information and music styles per floor
- Example: "Ab 22:00 Uhr Party" with "Floor 1: Salsa Cubana mit DJ TimbaMo"

🔄 RECURRING PATTERN STANDARDIZATION (enhanced recognition):
- "jeden Montag", "montags", "every Monday" → "weekly_monday"
- "jeden Dienstag", "dienstags", "every Tuesday" → "weekly_tuesday"  
- "jeden Mittwoch", "mittwochs", "every Wednesday" → "weekly_wednesday"
- "jeden Donnerstag", "donnerstags", "every Thursday" → "weekly_thursday"
- "jeden Freitag", "freitags", "every Friday" → "weekly_friday"
- "jeden Samstag", "samstags", "every Saturday" → "weekly_saturday"
- "jeden Sonntag", "sonntags", "every Sunday" → "weekly_sunday"
- "alle zwei Wochen", "zweiwöchentlich" → "biweekly"
- "wöchentlich" (without specific day) → "weekly"
- "monatlich", "jeden ersten [weekday]" → "monthly"
- If not recurring: null

🏙️ CITY EXTRACTION RULES:
- Extract ONLY the city name from venue_address
- Common German cities: Berlin, Hamburg, München, Köln, Frankfurt, Stuttgart, Düsseldorf, etc.
- Remove postal codes, street names, and "Germany"
- Example: "Venloer Str. 1031, 50829 Köln" → city: "Köln"
- If no clear city found, use: ${city}
- If not recurring: null

✅ CONTENT FILTERING (examples, not exhaustive - use your judgment):
- ONLY include actual dance events/parties/socials
- SKIP pure courses/lessons unless they mention "Party" or "Social Dance" afterwards
- YOU decide if content is dance-related based on mentions of dancing, events, parties
- Examples of relevant terms: "Social Dance", "Party", "Open Floor", "Salsa Night", "Bachata Evening"
- Examples of terms to avoid (unless followed by party): "Probestunde", "Unterricht", "Kurs", "Workshop" (alone)

📍 LOCATION: City context is ${city}

Return ONLY valid JSON, no markdown, no explanations.

Content:
${content}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('[DEBUG] Gemini AI response length:', text.length);
    console.log('[DEBUG] Gemini AI response preview:', text.substring(0, 500));
    
    // Try to parse JSON response
    try {
      // Remove any markdown formatting
      let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Find JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        console.log('[DEBUG] Parsed Gemini data:', JSON.stringify(data, null, 2));
        return data.events || [];
      } else {
        console.log('[DEBUG] No JSON object found in Gemini response');
      }
    } catch (parseErr) {
      console.error('[DEBUG] Error parsing Gemini response:', parseErr.message);
      console.error('[DEBUG] Raw response:', text);
    }
    
    return [];
  } catch (err) {
    console.error('Error using Gemini AI:', err.message);
    return [];
  }
}

/**
 * Extract base recurrence pattern from specific recurring pattern.
 * weekly_monday → weekly, monthly → monthly, biweekly → biweekly, etc.
 */
function extractBaseRecurrence(recurringPattern) {
  if (!recurringPattern) return null;
  
  if (recurringPattern.startsWith('weekly_')) return 'weekly';
  if (recurringPattern === 'biweekly') return 'biweekly';
  if (recurringPattern === 'monthly') return 'monthly';
  if (recurringPattern === 'weekly') return 'weekly';
  
  return recurringPattern; // fallback to original pattern
}

/**
 * Calculate the next occurrence date for recurring patterns.
 */
function calculateNextOccurrence(recurringPattern, baseDate) {
  const base = new Date(baseDate);
  const today = new Date();
  
  // Use today if base date is in the past
  const startDate = base < today ? today : base;
  
  switch (recurringPattern) {
    case 'weekly_monday':
      return getNextWeekday(startDate, 1);
    case 'weekly_tuesday':
      return getNextWeekday(startDate, 2);
    case 'weekly_wednesday':
      return getNextWeekday(startDate, 3);
    case 'weekly_thursday':
      return getNextWeekday(startDate, 4);
    case 'weekly_friday':
      return getNextWeekday(startDate, 5);
    case 'weekly_saturday':
      return getNextWeekday(startDate, 6);
    case 'weekly_sunday':
      return getNextWeekday(startDate, 0);
    default:
      return startDate.toISOString().split('T')[0];
  }
}

/**
 * Get the next occurrence of a specific weekday.
 */
function getNextWeekday(fromDate, targetDay) {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  
  // If it's the same day and we're looking for next occurrence, add 7 days
  if (daysUntilTarget === 0) {
    date.setDate(date.getDate() + 7);
  } else {
    date.setDate(date.getDate() + daysUntilTarget);
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Extract city name from venue address.
 */
function extractCityFromAddress(address, fallbackCity) {
  if (!address) return fallbackCity;
  
  const germanCities = [
    'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 
    'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
    'Hannover', 'Nürnberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
    'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
    'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel',
    'Aachen', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Lübeck',
    'Oberhausen', 'Erfurt', 'Mainz', 'Rostock', 'Kassel', 'Hagen',
    'Potsdam', 'Saarbrücken', 'Hamm', 'Mülheim', 'Ludwigshafen', 'Leverkusen'
  ];
  
  // Try to find a German city in the address
  for (const city of germanCities) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  
  // If no city found, return fallback
  return fallbackCity;
}

/**
 * Create individual event records for each date in multiple_dates array.
 */
async function createMultipleDateEvents(baseEvent, allEvents) {
  console.log(`      🗓️  createMultipleDateEvents called for: "${baseEvent.title}"`);
  console.log(`      Multiple dates: ${JSON.stringify(baseEvent.multiple_dates)}`);
  
  if (!baseEvent.multiple_dates || baseEvent.multiple_dates.length === 0) {
    // No multiple dates, just add the single event
    console.log(`      📝 Adding single event (no multiple dates)`);
    allEvents.push(baseEvent);
    console.log(`      ✅ Single event added, allEvents.length now: ${allEvents.length}`);
    return;
  }

  // Sort dates to ensure consistent order
  const sortedDates = baseEvent.multiple_dates.sort();
  console.log(`      📅 Processing ${sortedDates.length} multiple dates: ${sortedDates.join(', ')}`);
  
  for (let i = 0; i < sortedDates.length; i++) {
    const eventDate = sortedDates[i];
    
    // Create a copy of the base event for this date
    const dateSpecificEvent = {
      ...baseEvent,
      date: eventDate,
      is_primary: i === 0, // First event is primary
      original_event_id: null, // Will be set after first insertion
      multiple_dates: [] // Remove multiple_dates from individual records
    };
    
    console.log(`      📝 Adding date-specific event for ${eventDate} (primary: ${dateSpecificEvent.is_primary})`);
    allEvents.push(dateSpecificEvent);
  }
  
  console.log(`      ✅ Multiple date events created, allEvents.length now: ${allEvents.length}`);
}

/**
 * Insert event and return the inserted event ID.
 */
async function insertEventAndGetId(eventData) {
  const result = await pool.query(
    `INSERT INTO events (title, date, time, address, city, source, dance_styles, venue_type, workshop_date, workshop_time, party_date, party_time, workshops, party, recurrence, recurring_pattern, original_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id`,
    [
      eventData.title,
      eventData.date,
      eventData.time,
      eventData.address,
      eventData.city,
      eventData.source,
      JSON.stringify(eventData.dance_styles),
      eventData.venue_type,
      eventData.workshop_date,
      eventData.workshop_time,
      eventData.party_date,
      eventData.party_time,
      eventData.workshops ? JSON.stringify(eventData.workshops) : null,
      eventData.party ? JSON.stringify(eventData.party) : null,
      eventData.recurrence,
      eventData.recurring_pattern,
      eventData.original_event_id
    ]
  );
  return result.rows[0].id;
}

/**
 * Insert multiple date records into event_dates table.
 */
async function insertEventDates(eventId, dates, time) {
  for (const date of dates) {
    await pool.query(
      `INSERT INTO event_dates (event_id, event_date, event_time, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, event_date) DO NOTHING`,
      [eventId, date, time, date === dates[0]]
    );
  }
}

/**
 * Main function: search Google API and extract events using full scraping + Gemini AI.
 */
async function collectSalsaEvents(city, date, weekday, styles = [], statusObj) {
  console.log('[SCRAPER ENDPOINT CALLED]', city, date, weekday, 'styles:', styles);
  const query = buildSearchQuery(city, date, weekday, styles);
  
  if (statusObj) statusObj.steps.push({ step: 'google_query', message: query });
  
  let data = null;
  try {
    data = await fetchGoogleResults(query);
    console.log('[SCRAPER] Google API data received');
    if (statusObj) statusObj.steps.push({ step: 'google_results', message: `Google API returned ${data.items?.length || 0} results` });
  } catch (e) {
    if (statusObj) statusObj.steps.push({ step: 'google_error', message: e.message });
    console.error('[SCRAPER] Google search error:', e.message);
    return;
  }

  if (!data.items || data.items.length === 0) {
    console.log('[SCRAPER] No search results found');
    if (statusObj) statusObj.steps.push({ step: 'no_results', message: 'No search results found' });
    return;
  }

  // Save URLs for debugging
  const urls = data.items.map(item => item.link);
  fs.writeFileSync('scraper_google_urls.txt', urls.join('\n'), 'utf8');
  
  console.log(`[SCRAPER] Processing ${data.items.length} URLs from first page`);
  
  const allEvents = [];
  let processedCount = 0;
  
  for (const item of data.items) {
    processedCount++;
    const url = item.link;
    
    console.log(`[${processedCount}/${data.items.length}] Processing: ${url}`);
    if (statusObj) statusObj.steps.push({ step: 'processing_url', message: `${processedCount}/${data.items.length}: ${url}` });
    
    // Check if URL was recently scraped
    const isRecent = await isRecentlyScrapped(url);
    if (isRecent) {
      console.log(`Skipping recently scraped URL: ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'skip_recent', message: `Skipped: ${url}` });
      continue;
    }
    
    // Check robots.txt
    const isAllowed = await isAllowedByRobots(url);
    if (!isAllowed) {
      console.log(`Blocked by robots.txt: ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'robots_blocked', message: `Blocked: ${url}` });
      continue;
    }
    
    // Add delay between requests (human-like speed)
    if (processedCount > 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Scrape page content
    const content = await scrapePage(url);
    if (!content) {
      console.log(`Failed to scrape content from: ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'scrape_failed', message: `Failed: ${url}` });
      continue;
    }
    
    // Extract events using Gemini AI
    const events = await extractEventDataWithGemini(content, url, city, date);
    
    // Mark URL as scraped regardless of extraction success
    await markUrlAsScraped(url, events.length > 0, events.length);
    
    if (events.length > 0) {
      console.log(`Extracted ${events.length} events from ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'events_extracted', message: `${events.length} events from ${url}` });
      
      // Process and enhance each event
      console.log(`📋 Processing ${events.length} events for enhancement and date handling...`);
      for (const event of events) {
        try {
          console.log(`\n🔧 Processing event: "${event.title}" (date: ${event.date})`);
          console.log(`   Recurring pattern: ${event.recurring_pattern}`);
        
        // Extract city from venue address
        event.city = extractCityFromAddress(event.venue_address, city);
        console.log(`   City extracted: ${event.city}`);
        
        // Handle recurring patterns and calculate actual dates
        if (event.recurring_pattern && event.recurring_pattern.includes('weekly_') && !event.date) {
          console.log(`   🔄 Calculating next occurrence for recurring pattern: ${event.recurring_pattern}`);
          event.date = calculateNextOccurrence(event.recurring_pattern, date);
          console.log(`   ✅ Calculated next occurrence: ${event.date}`);
        }
        
        // Ensure date field is never null or undefined - use search date as fallback
        if (!event.date || event.date === null || event.date === 'null' || event.date === undefined || event.date === 'undefined') {
          console.log(`   ⚠️ Invalid/missing date "${event.date}", using fallback date ${date}`);
          event.date = date;
          console.log(`   ✅ Set fallback date ${date} for event: ${event.title}`);
        }
        
        console.log(`   📅 Final event date: ${event.date}`);
        
        // Filter out very old events (before 2024)
        let eventYear;
        try {
          eventYear = new Date(event.date).getFullYear();
          console.log(`   📊 Event year: ${eventYear} (threshold: 2024)`);
        } catch (err) {
          console.log(`   ❌ Error parsing date "${event.date}":`, err.message);
          console.log(`   🔄 Using fallback date ${date}`);
          event.date = date;
          eventYear = new Date(event.date).getFullYear();
          console.log(`   ✅ Event year after fallback: ${eventYear}`);
        }
        
        if (eventYear < 2024) {
          console.log(`   ⏭️ Skipping old event from ${eventYear}: ${event.title}`);
          continue; // Skip this event and continue with next
        }
        
        console.log(`   ✅ Event passed year filter`);
        
        // Add source URL to each event
        event.source_url = url;
        console.log(`   Source URL set: ${event.source_url}`);
        
        // Handle multiple dates - create individual events for each date
        console.log(`   📅 Before createMultipleDateEvents: allEvents.length = ${allEvents.length}`);
        await createMultipleDateEvents(event, allEvents);
        console.log(`   📅 After createMultipleDateEvents: allEvents.length = ${allEvents.length}`);
        } catch (eventErr) {
          console.error(`❌ Error processing event "${event.title}":`, eventErr.message);
          console.error(`Full error:`, eventErr);
          // Continue with next event instead of stopping entire process
        }
      }
    } else {
      console.log(`No events found in: ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'no_events', message: `No events: ${url}` });
    }
  }

  console.log(`\n🏁 URL processing complete. Final allEvents.length: ${allEvents.length}`);
  console.log(`Total events extracted: ${allEvents.length}`);
  if (statusObj) statusObj.steps.push({ step: 'total_extracted', message: `Total events extracted: ${allEvents.length}` });

  // Debug: Log first few events
  console.log('DEBUG: First 3 processed events:');
  allEvents.slice(0, 3).forEach((event, idx) => {
    console.log(`Event ${idx + 1}: ${event.title} - Date: ${event.date} - City: ${event.city} - Source: ${event.source_url}`);
  });

  console.log(`\n🔍 Starting database insertion process for ${allEvents.length} events...`);

  // Insert events into database with multiple dates support
  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let primaryEventId = null;
  
  for (const event of allEvents) {
    try {
      console.log(`\n--- Processing event for insertion: ${event.title} ---`);
      console.log(`Date: ${event.date}, City: ${event.city}, Address: ${event.venue_address}`);
      console.log(`Source URL: ${event.source_url}`);
      
      // Check for duplicates by source URL, date, and title (more specific than address)
      console.log(`🔍 Checking for duplicates: source="${event.source_url}", date="${event.date}", title="${event.title}"`);
      const { rows } = await pool.query(
        "SELECT 1 FROM events WHERE source = $1 AND date = $2 AND title = $3", 
        [event.source_url, event.date, event.title]
      );
      
      if (rows.length > 0) {
        console.log(`❌ Skipping duplicate event: ${event.title} (found ${rows.length} matches)`);
        if (statusObj) statusObj.steps.push({ step: 'skip_duplicate', message: event.title });
        skippedCount++;
        continue;
      }
      
      console.log(`✅ No duplicates found, proceeding with insertion...`);

      // Ensure required fields have values
      const eventData = {
        title: event.title || 'Untitled Event',
        date: event.date,
        time: event.time || null,
        address: event.venue_address || event.venue_name || 'Location TBD',
        city: event.city || city,
        source: event.source_url || 'No source available',
        dance_styles: event.dance_styles || [],
        venue_type: event.venue_type || 'Unspecified',
        workshop_date: event.workshop_date,
        workshop_time: event.workshop_time,
        party_date: event.party_date,
        party_time: event.party_time,
        workshops: event.workshops || null,
        party: event.party || null,
        recurrence: extractBaseRecurrence(event.recurring_pattern),
        recurring_pattern: event.recurring_pattern || null,
        original_event_id: event.is_primary ? null : primaryEventId
      };

      console.log(`Inserting event data:`, {
        title: eventData.title,
        date: eventData.date,
        city: eventData.city,
        recurrence: eventData.recurrence,
        recurring_pattern: eventData.recurring_pattern
      });

      // Insert new event and get ID
      const eventId = await insertEventAndGetId(eventData);
      console.log(`Successfully inserted event with ID: ${eventId}`);
      
      // If this is the primary event (first in a series), store its ID
      if (event.is_primary || !primaryEventId) {
        primaryEventId = eventId;
      }
      
      // Update original_event_id for non-primary events
      if (!event.is_primary && primaryEventId && primaryEventId !== eventId) {
        await pool.query(
          'UPDATE events SET original_event_id = $1 WHERE id = $2',
          [primaryEventId, eventId]
        );
        console.log(`Updated original_event_id for event ${eventId} to ${primaryEventId}`);
      }
      
      insertedCount++;
      console.log(`✅ Inserted event: ${eventData.title} for ${eventData.date}`);
      if (statusObj) statusObj.steps.push({ step: 'db_inserted', message: `${eventData.title} (${eventData.date})` });
      
    } catch (err) {
      errorCount++;
      console.error(`❌ Error inserting event ${event.title}:`, err.message);
      console.error('Full error:', err);
      if (statusObj) statusObj.steps.push({ step: 'db_insert_error', message: `${event.title}: ${err.message}` });
    }
  }

  console.log(`\n🏁 DATABASE INSERTION COMPLETE:`);
  console.log(`   ✅ Successfully inserted: ${insertedCount} events`);
  console.log(`   ⏭️  Skipped (duplicates): ${skippedCount} events`);
  console.log(`   ❌ Errors: ${errorCount} events`);
  console.log(`   📊 Total processed: ${insertedCount + skippedCount + errorCount} events`);
  
  if (statusObj) statusObj.steps.push({ step: 'complete', message: `Successfully inserted ${insertedCount} new events (${skippedCount} skipped, ${errorCount} errors)` });
}

module.exports = { collectSalsaEvents };
