import React, { useState } from 'react';
import '../styles/theme.css';

/**
 * List of available dance styles for filtering events.
 * Must match the required names and order.
 */
const DANCE_STYLES = [
  'Salsa (undefined style)',
  'Salsa On 2',
  'Salsa L.A.',
  'Salsa Cubana',
  'Bachata (undefined style)',
  'Bachata Dominicana',
  'Bachata Sensual',
  'Kizomba',
  'Zouk',
  'Forró',
];

/**
 * Filter bar component with round labels, city search, date picker, and search button.
 * @param {Object} props
 * @param {boolean} props.showFavoritesOnly - Whether to show only favorite events.
 * @param {function(boolean):void} props.onToggleFavoritesOnly - Callback when favorites filter is toggled.
 * @param {function(Object):void} props.onSearch - Callback when search is performed.
 * @param {boolean} props.loading - Whether the search is loading.
 * @returns {JSX.Element} The filter bar component.
 */
function FilterBar({ showFavoritesOnly = false, onToggleFavoritesOnly, onSearch, loading }) {
  // Renders the filter bar with dance style labels, city input, date input, and search button.
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');

  /**
   * Toggle selection of a dance style.
   * @param {string} style - The dance style to toggle.
   */
  function toggleStyle(style) {
    // Toggles the selected state of a dance style label.
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  }

  /**
   * Validate city input to prevent injection and only allow safe characters.
   * @param {string} value
   * @returns {boolean}
   */
  function isValidCity(value) {
    // Allow only letters, spaces, and hyphens (no numbers or special chars)
    return /^[a-zA-ZÀ-ÿ\s'-]+$/.test(value.trim());
  }

  /**
   * Handle search button click (to be implemented).
   * @param {Event} e - The form submit event.
   */
  function handleSearch(e) {
    // Handles the search form submission.
    e.preventDefault();
    if (!isValidCity(city) && city.length > 0) {
      alert('Please enter a valid city name (letters, spaces, hyphens only).');
      return;
    }
    if (onSearch) onSearch({ city, date, styles: selectedStyles });
  }

  /**
   * Updates the city input state.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleCityChange(e) {
    setCity(e.target.value);
  }

  return (
    <form
      onSubmit={handleSearch}
      style={{
        background: '#2d1818',
        borderRadius: '18px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        padding: '1.5em 2em',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5em',
        position: 'relative',
        top: '-40px',
        zIndex: 2,
        width: '75%',
        margin: '0 auto',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2em' }}>
        {DANCE_STYLES.map((style) => (
          <span
            key={style}
            className={`round-label${selectedStyles.includes(style) ? ' selected' : ''}`}
            onClick={() => toggleStyle(style)}
            tabIndex={0}
            role="button"
            aria-pressed={selectedStyles.includes(style)}
          >
            {style}
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="City"
        value={city}
        onChange={handleCityChange}
        style={{ borderRadius: '8px', border: 'none', padding: '0.5em 1em', fontFamily: 'Poppins, sans-serif', fontSize: '1em', minWidth: '120px' }}
        aria-label="City"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ borderRadius: '8px', border: 'none', padding: '0.5em 1em', fontFamily: 'Poppins, sans-serif', fontSize: '1em', minWidth: '120px' }}
        aria-label="Date"
      />
      <button type="submit" style={{ minWidth: '120px', position: 'relative' }} disabled={loading}>
        {loading ? (
          <span className="spinner" style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid #fff', borderTop: '3px solid #E92932', borderRadius: '50%', animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} />
        ) : 'Search'}
      </button>
    </form>
  );
}

// Add spinner CSS to theme.css:
// @keyframes spin { 100% { transform: rotate(360deg); } }
// .spinner { ... }

export default FilterBar;
