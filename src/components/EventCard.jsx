import React from 'react';
import '../styles/theme.css';

/**
 * Helper to get the ISO week number for a date.
 * @param {Date} date
 * @returns {string} e.g. '2025-W27'
 */
function getWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum}`;
}

/**
 * EventCard component displays a single event with details and actions.
 * @param {Object} props
 * @param {Object} props.event - The event object to display.
 * @param {Array<{type: 'exists'|'notexists', date: string}>} props.votes - Array of vote objects for this event.
 * @param {function('exists'|'notexists'):void} props.onVote - Callback when a vote is cast.
 * @param {'exists'|'notexists'|null} props.lastVoted - The last vote type by the current user (if any).
 * @param {boolean} props.isFavorite - Whether this event is marked as favorite.
 * @param {function(number):void} props.onToggleFavorite - Callback when favorite status is toggled.
 * @returns {JSX.Element} The event card component.
 */
function EventCard({ event, votes = [], onVote, lastVoted, isFavorite = false, onToggleFavorite, venueVotes = [], onVenueVote, lastVenueVoted = null }) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Calculate weekly and total vote stats
  const now = new Date();
  const thisWeek = getWeekKey(now);

  // Group votes by week and count totals
  const weekVotes = votes.reduce((acc, v) => {
    const wk = getWeekKey(new Date(v.date));
    if (!acc[wk]) acc[wk] = { exists: 0, notexists: 0 };
    acc[wk][v.type]++;
    return acc;
  }, {});

  // Calculate total votes
  let totalExists = 0, totalNotExists = 0;
  votes.forEach(v => {
    if (v.type === 'exists') totalExists++;
    if (v.type === 'notexists') totalNotExists++;
  });

  // Votes for this week
  const thisWeekExists = weekVotes[thisWeek]?.exists || 0;
  const thisWeekNotExists = weekVotes[thisWeek]?.notexists || 0;
  const likelyReal = totalExists > totalNotExists;

  // Venue voting stats
  const venueCounts = venueVotes.reduce((acc, v) => {
    if (v.type === 'indoor') acc.indoor++;
    if (v.type === 'outdoor') acc.outdoor++;
    return acc;
  }, { indoor: 0, outdoor: 0 });

  /**
   * Toggle the details section.
   */
  function toggleDetails() {
    setShowDetails((prev) => !prev);
  }

  /**
   * Handle voting for event existence.
   * @param {'exists'|'notexists'} type
   */
  function handleVote(type) {
    if (onVote) onVote(type);
  }

  /**
   * Handle toggling favorite status.
   */
  function handleToggleFavorite() {
    if (onToggleFavorite) onToggleFavorite(event.id);
  }

  return (
    <div style={{
      borderBottom: '1px solid #3a2323',
      padding: '1.5em 0',
      fontFamily: 'Poppins, sans-serif',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      {/* Status bar for likely real event */}
      <div style={{
        width: '8px',
        borderRadius: '8px',
        marginRight: '1.2em',
        background: likelyReal ? '#388e3c' : '#e6c200',
        transition: 'background 0.3s',
        minHeight: '100%',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
          <span style={{ fontWeight: 600, fontSize: '1.2em', color: '#fff' }}>{event.title}</span>
          {event.trusted && (
            <span style={{
              background: '#388e3c',
              color: '#fff',
              borderRadius: '999px',
              padding: '0.2em 0.8em',
              fontSize: '0.9em',
              marginLeft: '0.5em',
              fontWeight: 500,
            }}>Trusted Source</span>
          )}
        </div>
        <div style={{ color: '#fff', opacity: 0.85, margin: '0.3em 0' }}>{event.date}</div>
        <div style={{ color: '#fff', opacity: 0.7 }}>{event.address}</div>
        {event.source && (
          <div style={{ marginBottom: '0.7em' }}>
            <a 
              href={event.source} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#E92932', 
                opacity: 0.8, 
                fontSize: '0.95em',
                textDecoration: 'none',
                borderBottom: '1px solid #E92932'
              }}
            >
              View Original Event
            </a>
          </div>
        )}
        <button 
          style={{ 
            marginRight: '1em',
            background: isFavorite ? '#E92932' : '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '0.5em 1em',
            cursor: 'pointer',
            fontSize: '0.9em',
            transition: 'all 0.3s ease',
          }}
          onClick={handleToggleFavorite}
        >
          {isFavorite ? '❤️ Saved' : '🤍 Save'}
        </button>
        <button onClick={toggleDetails}>{showDetails ? 'Hide Details' : 'Details'}</button>
        {showDetails && (
          <div style={{ marginTop: '1.5em', background: '#1a0d0d', borderRadius: '12px', padding: '1.5em' }}>
            {/* Recurrence info with icon */}
            {event.recurrence && (
              <div style={{
                marginBottom: '1.2em',
                color: '#fff',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6em',
              }}>
                <span style={{
                  background: '#3a2323',
                  borderRadius: '999px',
                  padding: '0.3em 1.1em 0.3em 0.8em',
                  fontSize: '1em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5em',
                }}>
                  <span role="img" aria-label="recurring">🔁</span>
                  {typeof event.recurrence === 'string' ? event.recurrence : 'This event recurs.'}
                </span>
              </div>
            )}
            {/* Venue type label with icon and weather warning banner */}
            <div style={{ marginBottom: event.venueType ? '1.2em' : '0.7em', display: 'flex', alignItems: 'center', gap: '0.7em' }}>
              <span style={{
                background: '#E92932',
                color: '#fff',
                borderRadius: '999px',
                padding: '0.3em 1.2em 0.3em 0.9em',
                fontWeight: 600,
                fontSize: '1em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5em',
              }}>
                {event.venueType && event.venueType.toLowerCase() === 'outdoor' && (
                  <span role="img" aria-label="outdoor">🌳</span>
                )}
                {event.venueType && event.venueType.toLowerCase() === 'indoor' && (
                  <span role="img" aria-label="indoor">🏠</span>
                )}
                Venue: {event.venueType ? (event.venueType.charAt(0).toUpperCase() + event.venueType.slice(1)) : 'Not specified'}
              </span>
              {/* Weather warning if outdoor */}
              {event.venueType && event.venueType.toLowerCase() === 'outdoor' && (
                <div style={{
                  background: 'linear-gradient(90deg, #ffe066 60%, #fffbe6 100%)',
                  color: '#a15c00',
                  borderRadius: '10px',
                  padding: '0.7em 1.2em',
                  fontWeight: 700,
                  fontSize: '1.08em',
                  margin: '0',
                  boxShadow: '0 2px 8px #ffe06655',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7em',
                }}>
                  <span role="img" aria-label="weather warning">⚠️</span>
                  Weather warning: This event is outdoors and may be weather-dependent!
                </div>
              )}
            </div>
            {/* Workshop details */}
            {event.workshops && event.workshops.length > 0 && (
              <div style={{ marginBottom: '1.2em' }}>
                <h3 style={{ color: '#fff', fontSize: '1.1em', margin: '0 0 0.5em 0' }}>Workshops</h3>
                {event.workshops.map((ws, idx) => (
                  <div key={idx} style={{ color: '#fff', marginBottom: '0.5em' }}>
                    <strong>{ws.style}</strong> ({ws.level})<br />
                    {ws.start} - {ws.end}
                  </div>
                ))}
              </div>
            )}
            {/* Party details */}
            {event.party && (
              <div style={{ marginBottom: '1.2em' }}>
                <h3 style={{ color: '#fff', fontSize: '1.1em', margin: '0 0 0.5em 0' }}>Party</h3>
                <div style={{ color: '#fff' }}>
                  Start: {event.party.start}<br />
                  {event.party.end ? `End: ${event.party.end}` : `from ${event.party.start}`}
                  <br />
                  {event.party.floors && event.party.floors.map((floor, idx) => (
                    <div key={idx} style={{ marginTop: '0.3em' }}>
                      <strong>Floor {idx + 1}:</strong> {floor.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Existence voting buttons */}
            <div style={{ display: 'flex', gap: '1em', alignItems: 'center', justifyContent: 'center' }}>
              <button
                style={{ background: '#388e3c', minWidth: '120px', opacity: lastVoted === 'exists' ? 0.7 : 1 }}
                onClick={() => handleVote('exists')}
                type="button"
              >
                This event really exists
                <span style={{ marginLeft: 6, background: '#fff', color: '#388e3c', borderRadius: 8, padding: '0 8px' }}>{totalExists}</span>
                <span style={{ marginLeft: 6, fontSize: '0.85em', color: '#388e3c', background: '#fff3', borderRadius: 8, padding: '0 6px' }}>+{thisWeekExists} this week</span>
              </button>
              <button
                style={{ background: '#e6c200', color: '#221112', minWidth: '120px', opacity: lastVoted === 'notexists' ? 0.7 : 1 }}
                onClick={() => handleVote('notexists')}
                type="button"
              >
                This event doesn’t exist
                <span style={{ marginLeft: 6, background: '#fff', color: '#e6c200', borderRadius: 8, padding: '0 8px' }}>{totalNotExists}</span>
                <span style={{ marginLeft: 6, fontSize: '0.85em', color: '#e6c200', background: '#fff3', borderRadius: 8, padding: '0 6px' }}>+{thisWeekNotExists} this week</span>
              </button>
            </div>
            <div style={{ color: '#fff', fontSize: '0.9em', marginTop: '1em', opacity: 0.7 }}>
              Showing total votes and this week's trend
            </div>
            {/* Venue type voting if not specified */}
            {!event.venueType && (
              <div style={{ marginBottom: '1.2em', color: '#fff', fontWeight: 500 }}>
                <div style={{ marginBottom: '0.5em', textAlign: 'center' }}>What type of venue is this event?</div>
                <div style={{ display: 'flex', gap: '1em', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    style={{
                      background: '#E92932',
                      color: '#fff',
                      borderRadius: '999px',
                      border: 'none',
                      padding: '0.5em 1.2em',
                      fontWeight: 600,
                      fontSize: '1em',
                      opacity: lastVenueVoted === 'indoor' ? 0.7 : 1,
                      boxShadow: lastVenueVoted === 'indoor' ? '0 0 0 2px #fff' : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5em',
                      cursor: 'pointer',
                    }}
                    onClick={() => onVenueVote && onVenueVote('indoor')}
                  >
                    <span role="img" aria-label="indoor">🏠</span> Indoor
                    <span style={{ marginLeft: 6, background: '#fff', color: '#E92932', borderRadius: 8, padding: '0 8px' }}>{venueCounts.indoor}</span>
                  </button>
                  <button
                    style={{
                      background: '#388e3c',
                      color: '#fff',
                      borderRadius: '999px',
                      border: 'none',
                      padding: '0.5em 1.2em',
                      fontWeight: 600,
                      fontSize: '1em',
                      opacity: lastVenueVoted === 'outdoor' ? 0.7 : 1,
                      boxShadow: lastVenueVoted === 'outdoor' ? '0 0 0 2px #fff' : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5em',
                      cursor: 'pointer',
                    }}
                    onClick={() => onVenueVote && onVenueVote('outdoor')}
                  >
                    <span role="img" aria-label="outdoor">🌳</span> Outdoor
                    <span style={{ marginLeft: 6, background: '#fff', color: '#388e3c', borderRadius: 8, padding: '0 8px' }}>{venueCounts.outdoor}</span>
                  </button>
                </div>
                <div style={{ color: '#fff', fontSize: '0.9em', marginTop: '0.5em', opacity: 0.7, textAlign: 'center' }}>
                  Vote to help others know if this event is indoors or outdoors.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
