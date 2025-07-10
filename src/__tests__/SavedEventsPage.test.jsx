import React from 'react';
import { render, screen } from '@testing-library/react';
import SavedEventsPage from '../components/SavedEventsPage';

// Mock EventList to isolate SavedEventsPage logic
globalThis.__EventListProps = null;
jest.mock('../components/EventList', () => props => {
  globalThis.__EventListProps = props;
  return <div data-testid="event-list-mock" />;
});

describe('SavedEventsPage', () => {
  const baseProps = {
    events: [
      { id: 1, title: 'Salsa Night' },
      { id: 2, title: 'Bachata Bash' },
      { id: 3, title: 'Kizomba Party' },
    ],
    favoriteEventIds: [1, 3],
    votesByEvent: {},
    onVote: jest.fn(),
    lastVotedByEvent: {},
    onToggleFavorite: jest.fn(),
  };

  it('filters and passes only favorite events to EventList', () => {
    render(<SavedEventsPage {...baseProps} />);
    expect(globalThis.__EventListProps.events).toEqual([
      { id: 1, title: 'Salsa Night' },
      { id: 3, title: 'Kizomba Party' },
    ]);
    expect(globalThis.__EventListProps.headline).toBe('Saved Events');
  });

  it('renders EventList with empty events if no favorites', () => {
    render(<SavedEventsPage {...baseProps} favoriteEventIds={[]} />);
    expect(globalThis.__EventListProps.events).toEqual([]);
  });
});
