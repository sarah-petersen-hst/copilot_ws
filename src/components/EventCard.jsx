import React, { useState } from 'react';
import '../styles/theme.css';

/**
 * EventCard component displays a single event with details and actions.
 * @param {Object} props
 * @param {Object} props.event - The event object to display.
 * @returns {JSX.Element} The event card component.
 */
function EventCard({ event }) {
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Toggle the details section.
   */
  function toggleDetails() {
    setShowDetails((prev) => !prev);
  }

  return (
    <div style={{
      borderBottom: '1px solid #3a2323',
      padding: '1.5em 0',
      fontFamily: 'Poppins, sans-serif',
    }}>
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
          {/* TODO: Add workshop and party details here */}
          <div style={{ color: '#fff', opacity: 0.9 }}>Event details go here.</div>
        </div>
      )}
    </div>
  );
}

export default EventCard;
