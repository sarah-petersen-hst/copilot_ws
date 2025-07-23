import React from 'react';
import EventCard from './EventCard';
import '../styles/theme.css';

/**
 * EventList component displays a list of event cards.
 * @param {Object} props
 * @param {Array} props.events - Array of event objects to display.
 * @param {Object} props.votesByEvent - Map of eventId to votes array.
 * @param {function} props.onVote - Function to call when voting.
 * @param {Object} props.lastVotedByEvent - Map of eventId to last voted type.
 * @param {Array<number>} props.favoriteEventIds - Array of event IDs marked as favorites.
 * @param {function(number):void} props.onToggleFavorite - Callback when favorite status is toggled.
 * @param {string} [props.headline='Found Events'] - Headline for the event list section.
 * @returns {JSX.Element} The event list component.
 */
function EventList({ events, votesByEvent = {}, onVote, lastVotedByEvent = {}, favoriteEventIds = [], onToggleFavorite, headline = "Found Events", venueVotesByEvent = {}, lastVenueVotedByEvent = {}, onVenueVote }) {
  // Renders a list of EventCard components for each event.
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
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '2em', color: '#fff', marginBottom: '1em' }}>{headline}</h2>
      {events.length === 0 ? (
        <div style={{ color: '#fff', opacity: 0.7 }}>No events found.</div>
      ) : (
        events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            votes={votesByEvent[event.id] || []}
            onVote={type => onVote(event.id, type)}
            lastVoted={lastVotedByEvent[event.id] || null}
            isFavorite={favoriteEventIds.includes(event.id)}
            onToggleFavorite={onToggleFavorite}
            venueVotes={venueVotesByEvent[event.id] || []}
            onVenueVote={type => onVenueVote(event.id, type)}
            lastVenueVoted={lastVenueVotedByEvent[event.id] || null}
          />
        ))
      )}
    </section>
  );
}

export default EventList;
