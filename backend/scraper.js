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
function buildSearchQuery(city, date, weekday) {
  // Example: Salsa Veranstaltung Dienstag Berlin site:.de
  return `Salsa Veranstaltung ${weekday} ${city} site:.de`;
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
 * Check if a URL has been scraped recently (within 3 days).
 */
async function isRecentlyScrapped(url) {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM events WHERE source_url = $1 AND timestamp > NOW() - INTERVAL '3 days'",
      [url]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('Error checking recent scrapes:', err);
    return false;
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
Extract event information from this German webpage content about salsa/dance events. 
Return a JSON object with the following structure, or null if no valid events found:

{
  "events": [
    {
      "title": "Event title",
      "dance_styles": ["Salsa", "Bachata", "etc"],
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "venue_name": "Venue name",
      "venue_address": "Full address",
      "venue_type": "Indoor/Outdoor/Unspecified",
      "workshop_date": "YYYY-MM-DD or null",
      "workshop_time": "HH:MM or null",
      "party_date": "YYYY-MM-DD",
      "party_time": "HH:MM",
      "description": "Brief description",
      "recurring_pattern": "weekly/biweekly/monthly/null"
    }
  ]
}

Important rules:
1. Only include events related to dancing (Salsa, Bachata, Kizomba, etc.)
2. Skip pure courses/lessons unless they include a social dance/party
3. If no specific date is found, use: ${date}
4. If no specific time is found, use: "20:00"
5. Dance styles must be from this list: Salsa, Bachata, Kizomba, Zouk, Merengue, Cha Cha, Mambo, Reggaeton, Son, Rueda, Timba, Cumbia, Tango, Milonga, Vals, Swing, Lindy Hop, West Coast Swing, East Coast Swing, Jive, Boogie Woogie, Blues, Forró, Samba, Bolero, Discofox, Hustle, Paso Doble, Quickstep, Foxtrot, Waltz, Rumba, Cha-Cha-Cha
6. For venue_type: detect "Open Air", "draußen", "outdoor", "Garten", "Terrasse", "bei gutem Wetter", "Innenhof" = Outdoor
7. For recurring patterns: detect "wöchentlich", "alle zwei Wochen", "zweiwöchentlich", "monatlich", "jeden Freitag", etc.
8. City context: ${city}
9. Return valid JSON only, no markdown formatting

Content to analyze:
${content}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data.events || [];
      }
    } catch (parseErr) {
      console.error('Error parsing Gemini response:', parseErr);
    }
    
    return [];
  } catch (err) {
    console.error('Error using Gemini AI:', err.message);
    return [];
  }
}

/**
 * Filter content to check if it's relevant to dance events.
 */
function isRelevantContent(content) {
  const whitelist = [
    'social dance', 'party', 'open floor', 'milonga', 'salsa', 'bachata', 
    'kizomba', 'tango', 'swing', 'veranstaltung', 'event', 'tanzparty',
    'social dancing', 'dance party', 'tanzveranstaltung'
  ];
  
  const blacklist = [
    'probestunde', 'unterricht', 'kurs', 'workshop', 'lesson', 'class',
    'privatstunde', 'einzelstunde', 'gruppenstunde'
  ];
  
  const lowerContent = content.toLowerCase();
  
  // Check if it contains blacklisted terms without party/social context
  for (const term of blacklist) {
    if (lowerContent.includes(term)) {
      // Check if it's followed by party-related terms
      const partyTerms = ['party', 'social', 'milonga', 'practica', 'ball', 'veranstaltung'];
      const hasPartyContext = partyTerms.some(partyTerm => 
        lowerContent.includes(term + ' ' + partyTerm) || 
        lowerContent.includes(partyTerm + ' ' + term)
      );
      if (!hasPartyContext) {
        return false;
      }
    }
  }
  
  // Check if it contains whitelisted terms
  return whitelist.some(term => lowerContent.includes(term));
}

/**
 * Main function: search Google API and extract events using full scraping + Gemini AI.
 */
async function collectSalsaEvents(city, date, weekday, statusObj) {
  console.log('[SCRAPER ENDPOINT CALLED]', city, date, weekday);
  const query = buildSearchQuery(city, date, weekday);
  
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
  
  console.log(`[SCRAPER] Processing ${data.items.length} URLs`);
  
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
    
    // Check if content is relevant
    if (!isRelevantContent(content)) {
      console.log(`Content not relevant for dance events: ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'not_relevant', message: `Not relevant: ${url}` });
      continue;
    }
    
    // Extract events using Gemini AI
    const events = await extractEventDataWithGemini(content, url, city, date);
    
    if (events.length > 0) {
      console.log(`Extracted ${events.length} events from ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'events_extracted', message: `${events.length} events from ${url}` });
      
      // Add source URL to each event
      events.forEach(event => {
        event.source_url = url;
      });
      
      allEvents.push(...events);
    } else {
      console.log(`No events found in: ${url}`);
      if (statusObj) statusObj.steps.push({ step: 'no_events', message: `No events: ${url}` });
    }
  }

  console.log(`Total events extracted: ${allEvents.length}`);
  if (statusObj) statusObj.steps.push({ step: 'total_extracted', message: `Total events extracted: ${allEvents.length}` });

  // Insert events into database
  let insertedCount = 0;
  for (const event of allEvents) {
    try {
      // Check for duplicates by venue, date, and title
      const { rows } = await pool.query(
        "SELECT 1 FROM events WHERE venue_name = $1 AND date = $2 AND title = $3", 
        [event.venue_name, event.date, event.title]
      );
      
      if (rows.length > 0) {
        console.log(`Skipping duplicate event: ${event.title}`);
        if (statusObj) statusObj.steps.push({ step: 'skip_duplicate', message: event.title });
        continue;
      }

      // Insert new event
      await pool.query(
        `INSERT INTO events (title, date, time, venue_name, address, source, dance_styles, venue_type, workshop_date, workshop_time, party_date, party_time, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          event.title,
          event.date,
          event.time,
          event.venue_name,
          event.venue_address, // This will go to 'address' column
          event.source_url,    // This will go to 'source' column
          JSON.stringify(event.dance_styles),
          event.venue_type,
          event.workshop_date,
          event.workshop_time,
          event.party_date,
          event.party_time
        ]
      );
      
      insertedCount++;
      console.log(`Inserted event: ${event.title}`);
      if (statusObj) statusObj.steps.push({ step: 'db_inserted', message: event.title });
      
    } catch (err) {
      console.error(`Error inserting event ${event.title}:`, err.message);
      if (statusObj) statusObj.steps.push({ step: 'db_insert_error', message: `${event.title}: ${err.message}` });
    }
  }

  console.log(`Successfully inserted ${insertedCount} new events`);
  if (statusObj) statusObj.steps.push({ step: 'complete', message: `Successfully inserted ${insertedCount} new events` });
}

module.exports = { collectSalsaEvents };
