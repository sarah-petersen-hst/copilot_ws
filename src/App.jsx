import React from 'react';
import { useState } from 'react'
import NavBar from './components/NavBar';
import HeaderImage from './components/HeaderImage';
import FilterBar from './components/FilterBar';
import EventList from './components/EventList';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './styles/theme.css';

/**
 * Main application component for Salsa Dance Event Finder.
 * Renders the navigation bar, header image, filter bar, and event list.
 * @returns {JSX.Element} The main app component.
 */
function App() {
  const [count, setCount] = useState(0)

  // Example event data for development/testing
  const exampleEvents = [
    {
      id: 1,
      title: 'Salsa Night at Havana Club',
      date: '2025-07-05',
      address: '123 Main St, Berlin',
      source: 'Official Club Website',
      trusted: true,
    },
    {
      id: 2,
      title: 'Bachata Sensual Summer Party',
      date: '2025-07-12',
      address: '456 Dance Ave, Hamburg',
      source: 'Facebook Event',
      trusted: false,
    },
  ];

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <NavBar />
      <HeaderImage />
      <FilterBar />
      <EventList events={exampleEvents} />
      {/* TODO: Add event list and other containers here */}
    </>
  )
}

export default App
