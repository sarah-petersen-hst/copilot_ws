import React, { useEffect, useState } from 'react';
import NavBar from './components/NavBar';
import HeaderImage from './components/HeaderImage';
import FilterBar from './components/FilterBar';
import EventList from './components/EventList';
import SavedEventsPage from './components/SavedEventsPage';
import './App.css';
import './styles/theme.css';

/**
 * Main application component for Salsa Dance Event Finder.
 * Fetches events and votes from backend and manages voting state.
 * Also manages favorite events using localStorage.
 * @returns {JSX.Element} The main app component.
 */
function App() {
  const [events, setEvents] = useState([]);
  const [votesByEvent, setVotesByEvent] = useState({});
  const [lastVotedByEvent, setLastVotedByEvent] = useState({});
  const [favoriteEventIds, setFavoriteEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('find'); // 'find' or 'saved'

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteEvents');
    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);
        setFavoriteEventIds(parsedFavorites);
      } catch (error) {
        console.error('Error parsing saved favorites:', error);
      }
    }
  }, []);

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
    // Determine last vote for this user
    let user_id = localStorage.getItem('user_id');
    if (user_id) {
      const userVote = data.find(v => v.user_id === user_id);
      setLastVotedByEvent(prev => ({ ...prev, [eventId]: userVote ? userVote.type : null }));
    } else {
      setLastVotedByEvent(prev => ({ ...prev, [eventId]: null }));
    }
  }

  // Handle voting for an event
  async function handleVote(eventId, type) {
    // Use a persistent user_id (e.g. from localStorage) for demo purposes
    let user_id = localStorage.getItem('user_id');
    if (!user_id) {
      user_id = Math.random().toString(36).substring(2, 12);
      localStorage.setItem('user_id', user_id);
    }
    const res = await fetch('http://localhost:4000/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, type, user_id })
    });
    // Always refetch votes after voting to ensure correct state
    fetchVotes(eventId);
  }

  /**
   * Handle toggling favorite status for an event.
   * @param {number} eventId - The ID of the event to toggle favorite status for.
   */
  function handleToggleFavorite(eventId) {
    setFavoriteEventIds(prev => {
      const newFavorites = prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId];
      
      // Save to localStorage
      localStorage.setItem('favoriteEvents', JSON.stringify(newFavorites));
      return newFavorites;
    });
  }

  // Navigation handler for NavBar
  function handleNav(pageKey) {
    setPage(pageKey);
  }

  return (
    <>
      <NavBar onNavigate={handleNav} currentPage={page} />
      <HeaderImage />
      {page === 'find' && (
        <>
          <FilterBar />
          {loading ? (
            <div style={{ color: '#fff', textAlign: 'center', marginTop: '2em' }}>Loading events...</div>
          ) : (
            <EventList
              events={events}
              votesByEvent={votesByEvent}
              onVote={handleVote}
              lastVotedByEvent={lastVotedByEvent}
              favoriteEventIds={favoriteEventIds}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </>
      )}
      {page === 'saved' && (
        <SavedEventsPage
          events={events}
          favoriteEventIds={favoriteEventIds}
          votesByEvent={votesByEvent}
          onVote={handleVote}
          lastVotedByEvent={lastVotedByEvent}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </>
  );
}

export default App;
