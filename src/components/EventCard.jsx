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
 * @returns {JSX.Element} The event card component.
 */
function EventCard({ event, votes = [], onVote, lastVoted }) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Calculate weekly vote stats
  const now = new Date();
  const thisWeek = getWeekKey(now);
  const lastWeek = getWeekKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

  // Group votes by week
  const weekVotes = votes.reduce((acc, v) => {
    const wk = getWeekKey(new Date(v.date));
    if (!acc[wk]) acc[wk] = { exists: 0, notexists: 0 };
    acc[wk][v.type]++;
    return acc;
  }, {});

  // Find the most recent week with votes
  let weekToShow = thisWeek;
  if (!weekVotes[thisWeek] || (weekVotes[thisWeek].exists + weekVotes[thisWeek].notexists === 0)) {
    if (weekVotes[lastWeek] && (weekVotes[lastWeek].exists + weekVotes[lastWeek].notexists > 0)) {
      weekToShow = lastWeek;
    } else {
      // Find the most recent week with any votes
      const weeks = Object.keys(weekVotes).sort().reverse();
      weekToShow = weeks.find(wk => weekVotes[wk].exists + weekVotes[wk].notexists > 0) || thisWeek;
    }
  }
  const existsVotes = weekVotes[weekToShow]?.exists || 0;
  const notExistsVotes = weekVotes[weekToShow]?.notexists || 0;
  const likelyReal = existsVotes > notExistsVotes;

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
        <div style={{ color: '#fff', opacity: 0.6, fontSize: '0.95em', marginBottom: '0.7em' }}>{event.source}</div>
        <button style={{ marginRight: '1em' }}>Save</button>
        <button onClick={toggleDetails}>{showDetails ? 'Hide Details' : 'Details'}</button>
        {showDetails && (
          <div style={{ marginTop: '1.5em', background: '#1a0d0d', borderRadius: '12px', padding: '1.5em' }}>
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
            <div style={{ display: 'flex', gap: '1em', alignItems: 'center' }}>
              <button
                style={{ background: '#388e3c', minWidth: '120px', opacity: lastVoted === 'exists' ? 0.7 : 1 }}
                onClick={() => handleVote('exists')}
                type="button"
              >
                This event really exists <span style={{ marginLeft: 6, background: '#fff', color: '#388e3c', borderRadius: 8, padding: '0 8px' }}>{existsVotes}</span>
              </button>
              <button
                style={{ background: '#e6c200', color: '#221112', minWidth: '120px', opacity: lastVoted === 'notexists' ? 0.7 : 1 }}
                onClick={() => handleVote('notexists')}
                type="button"
              >
                This event doesn’t exist <span style={{ marginLeft: 6, background: '#fff', color: '#e6c200', borderRadius: 8, padding: '0 8px' }}>{notExistsVotes}</span>
              </button>
            </div>
            <div style={{ color: '#fff', fontSize: '0.9em', marginTop: '1em', opacity: 0.7 }}>
              Showing votes for week: {weekToShow}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
