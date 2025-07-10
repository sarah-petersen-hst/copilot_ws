import React from 'react';
import '../styles/theme.css';

/**
 * Navigation bar for the Salsa Dance Event Finder site.
 * Contains main navigation items and sub-items as specified in the requirements.
 * @param {Object} props
 * @param {function(string):void} [props.onNavigate] - Callback for navigation.
 * @param {string} [props.currentPage] - Current page key ('find' or 'saved').
 * @returns {JSX.Element} The navigation bar component.
 */
function NavBar({ onNavigate, currentPage }) {
  // Renders the navigation bar with main and sub-items.
  return (
    <nav style={{ width: '100%', background: '#1a0d0d', padding: '0 0 0.5em 0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '1.3em', letterSpacing: '0.03em', color: '#fff', padding: '0.7em 1.2em 0.2em 1.2em' }}>Events</span>
          <div style={{ display: 'flex', gap: '1em', paddingLeft: '1.2em', fontSize: '1em' }}>
            <span
              style={{ color: currentPage === 'find' ? '#E92932' : '#fff', opacity: 0.85, cursor: 'pointer', fontWeight: currentPage === 'find' ? 600 : 400 }}
              onClick={() => onNavigate && onNavigate('find')}
            >
              Find Events
            </span>
            <span
              style={{ color: currentPage === 'saved' ? '#E92932' : '#fff', opacity: 0.85, cursor: 'pointer', fontWeight: currentPage === 'saved' ? 600 : 400 }}
              onClick={() => onNavigate && onNavigate('saved')}
            >
              Saved Events
            </span>
          </div>
        </div>
        <div>
          <span style={{ fontWeight: 500, fontSize: '1.1em', color: '#fff', padding: '0.7em 1.2em', cursor: 'pointer' }}>Legal Notice</span>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
