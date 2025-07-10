import React from 'react';
import { render, screen } from '@testing-library/react';
import EventList from '../components/EventList';

// Mock EventCard to isolate EventList logic
globalThis.__EventCardProps = [];
jest.mock('../components/EventCard', () => props => {
  globalThis.__EventCardProps.push(props);
  return <div data-testid={`event-card-mock-${props.event.id}`} />;
});

const events = [
  {
    id: 1,
    title: 'Salsa Night',
    date: '2025-07-05',
    address: '123 Main St',
    source: 'Official',
    trusted: true,
  },
  {
    id: 2,
    title: 'Bachata Bash',
    date: '2025-07-06',
    address: '456 Side St',
    source: 'Unofficial',
    trusted: false,
  },
];

describe('EventList', () => {
  beforeEach(() => { globalThis.__EventCardProps = []; });

  it('renders the heading', () => {
    render(<EventList events={events} />);
    expect(screen.getByText('Found Events')).toBeInTheDocument();
  });
  it('renders event cards', () => {
    render(<EventList events={events} />);
    expect(screen.getByTestId('event-card-mock-1')).toBeInTheDocument();
    expect(screen.getByTestId('event-card-mock-2')).toBeInTheDocument();
  });
  it('shows no events message if list is empty', () => {
    render(<EventList events={[]} />);
    expect(screen.getByText('No events found.')).toBeInTheDocument();
  });
  it('passes correct props to EventCard', () => {
    render(<EventList events={events} favoriteEventIds={[1]} onToggleFavorite={jest.fn()} onVote={jest.fn()} lastVotedByEvent={{}} votesByEvent={{}} />);
    expect(globalThis.__EventCardProps[0].event).toEqual(events[0]);
    expect(globalThis.__EventCardProps[0].isFavorite).toBe(true);
    expect(globalThis.__EventCardProps[1].isFavorite).toBe(false);
  });
  it('renders custom headline if provided', () => {
    render(<EventList events={events} headline="Custom Headline" />);
    expect(screen.getByText('Custom Headline')).toBeInTheDocument();
  });
});
