import React from 'react';
import EventCard from './EventCard';
import '../styles/theme.css';

/**
 * EventList component displays a list of event cards.
 * @param {Object} props
 * @param {Array} props.events - Array of event objects to display.
 * @returns {JSX.Element} The event list component.
 */
function EventList({ events }) {
  return (
    <section style={{
      background: '#2d1818',
      borderRadius: '18px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      padding: '2em',
      width: '75%',
      margin: '2em auto 0 auto',
      minHeight: '200px',
    }}>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '2em', color: '#fff', marginBottom: '1em' }}>Found Events</h2>
      {events.length === 0 ? (
        <div style={{ color: '#fff', opacity: 0.7 }}>No events found.</div>
      ) : (
        events.map(event => (
          <EventCard key={event.id} event={event} />
        ))
      )}
    </section>
  );
}

export default EventList;
