import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { act } from 'react-dom/test-utils';

// Mock child components to isolate App logic
globalThis.__NavBarProps = null;
globalThis.__EventListProps = null;
globalThis.__SavedEventsPageProps = null;
jest.mock('../components/NavBar', () => props => { globalThis.__NavBarProps = props; return <nav data-testid="navbar-mock" />; });
jest.mock('../components/HeaderImage', () => () => <div data-testid="headerimage-mock" />);
jest.mock('../components/FilterBar', () => () => <form data-testid="filterbar-mock" />);
jest.mock('../components/EventList', () => props => { globalThis.__EventListProps = props; return <div data-testid="eventlist-mock" />; });
jest.mock('../components/SavedEventsPage', () => props => { globalThis.__SavedEventsPageProps = props; return <div data-testid="savedeventspage-mock" />; });

describe('App', () => {
  beforeEach(() => {
    globalThis.__NavBarProps = null;
    globalThis.__EventListProps = null;
    globalThis.__SavedEventsPageProps = null;
    // Mock fetch
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ json: async () => ([{ id: 1, title: 'Test Event' }]) })
      .mockResolvedValue({ json: async () => ([])});
    localStorage.clear();
  });

  it('renders NavBar, HeaderImage, and FilterBar', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByTestId('navbar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('headerimage-mock')).toBeInTheDocument();
    expect(screen.getByTestId('filterbar-mock')).toBeInTheDocument();
  });

  it('loads events and passes them to EventList', async () => {
    await act(async () => {
      render(<App />);
    });
    await waitFor(() => expect(globalThis.__EventListProps).not.toBeNull());
    expect(globalThis.__EventListProps.events[0].title).toBe('Test Event');
  });

  it('toggles favorite events and persists to localStorage', async () => {
    await act(async () => {
      render(<App />);
    });
    await waitFor(() => expect(globalThis.__EventListProps).not.toBeNull());
    // Simulate toggling favorite
    act(() => {
      globalThis.__EventListProps.onToggleFavorite(1);
    });
    const favs = JSON.parse(localStorage.getItem('favoriteEvents')) || [];
    expect(favs).toContain(1);
  });

  it('navigates to Saved Events page when NavBar triggers navigation', async () => {
    await act(async () => {
      render(<App />);
    });
    await waitFor(() => expect(globalThis.__NavBarProps).not.toBeNull());
    // Simulate navigation
    act(() => {
      globalThis.__NavBarProps.onNavigate('saved');
    });
    await waitFor(() => expect(globalThis.__SavedEventsPageProps).not.toBeNull());
  });
});
