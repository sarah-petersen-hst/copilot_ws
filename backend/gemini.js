// backend/gemini.js
// Utility for calling the Gemini API to extract salsa event metadata from text
// Returns a normalized event object or null if extraction fails

const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Extracts salsa event metadata from raw text using Gemini LLM.
 * @param {string} text - Raw page text
 * @returns {Promise<Object|null>} - Normalized event object or null
 */
async function extractEventDataWithGemini(text) {
  const prompt = `Extrahiere die Metadaten für eine Salsa Tanzveranstaltung aus folgendem Text. Gib ein JSON mit folgenden Feldern zurück: title, styles (array), date, workshops (array, optional), party (object mit startzeit, optional), address, source_url, recurrence (optional), venueType ("indoor"/"outdoor"/"unspecified").

Text:
${text}
`;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const json = response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  } catch (e) {
    console.error('Gemini extraction failed:', e);
    return null;
  }
}

module.exports = { extractEventDataWithGemini };
