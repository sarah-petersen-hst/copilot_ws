import React from 'react';
import EventList from './EventList';

/**
 * SavedEventsPage displays all favorited events in a dedicated page.
 * @param {Object} props
 * @param {Array} props.events - All events from the backend.
 * @param {Array<number>} props.favoriteEventIds - Array of event IDs marked as favorites.
 * @param {Object} props.votesByEvent - Map of eventId to votes array.
 * @param {function(number, string):void} props.onVote - Voting handler.
 * @param {Object} props.lastVotedByEvent - Map of eventId to last voted type.
 * @param {function(number):void} props.onToggleFavorite - Favorite toggle handler.
 * @returns {JSX.Element}
 */
function SavedEventsPage({ events, favoriteEventIds, votesByEvent, onVote, lastVotedByEvent, onToggleFavorite }) {
  const favoriteEvents = events.filter(event => favoriteEventIds.includes(event.id));
  return (
    <section style={{
      background: '#2d1818',
      borderRadius: '18px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      padding: '2em',
      width: '75%',
      margin: '2em auto 0 auto',
      minHeight: '100px',
    }}>
      {/* Only the EventList, with headline changed to 'Saved Events' */}
      <EventList
        events={favoriteEvents}
        votesByEvent={votesByEvent}
        onVote={onVote}
        lastVotedByEvent={lastVotedByEvent}
        favoriteEventIds={favoriteEventIds}
        onToggleFavorite={onToggleFavorite}
        headline="Saved Events"
      />
    </section>
  );
}

export default SavedEventsPage;
