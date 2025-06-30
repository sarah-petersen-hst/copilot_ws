import React, { useEffect, useState } from 'react';
import NavBar from './components/NavBar';
import HeaderImage from './components/HeaderImage';
import FilterBar from './components/FilterBar';
import EventList from './components/EventList';
import './App.css';
import './styles/theme.css';

/**
 * Main application component for Salsa Dance Event Finder.
 * Fetches events and votes from backend and manages voting state.
 * @returns {JSX.Element} The main app component.
 */
function App() {
  const [events, setEvents] = useState([]);
  const [votesByEvent, setVotesByEvent] = useState({});
  const [lastVotedByEvent, setLastVotedByEvent] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch events from backend
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/events');
      const data = await res.json();
      setEvents(data);
      setLoading(false);
      // Fetch votes for each event
      data.forEach(event => fetchVotes(event.id));
    }
    fetchEvents();
  }, []);

  // Fetch votes for a specific event
  async function fetchVotes(eventId) {
    const res = await fetch(`http://localhost:4000/api/votes?event_id=${eventId}`);
    const data = await res.json();
    setVotesByEvent(prev => ({ ...prev, [eventId]: data }));
  }

  // Handle voting for an event
  async function handleVote(eventId, type) {
    // Optionally, set user_id from localStorage or session
    const user_id = null;
    await fetch('http://localhost:4000/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, type, user_id })
    });
    setLastVotedByEvent(prev => ({ ...prev, [eventId]: type }));
    fetchVotes(eventId);
  }

  return (
    <>
      <NavBar />
      <HeaderImage />
      <FilterBar />
      {loading ? (
        <div style={{ color: '#fff', textAlign: 'center', marginTop: '2em' }}>Loading events...</div>
      ) : (
        <EventList
          events={events}
          votesByEvent={votesByEvent}
          onVote={handleVote}
          lastVotedByEvent={lastVotedByEvent}
        />
      )}
    </>
  );
}

export default App;
