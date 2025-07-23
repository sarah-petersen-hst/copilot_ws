import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventCard from '../components/EventCard';

describe('EventCard', () => {
  const baseEvent = {
    id: 1,
    title: 'Salsa Night',
    date: '2025-07-05',
    address: '123 Main St',
    source: 'Official',
    trusted: true,
    workshops: [
      { style: 'Salsa', level: 'Beginner', start: '18:00', end: '19:00' }
    ],
    party: { start: '21:00', end: '02:00', floors: [{ description: 'Main Floor' }] },
  };
  const votes = [
    { type: 'exists', date: '2025-07-10', user_id: 'abc' },
    { type: 'notexists', date: '2025-07-10', user_id: 'def' },
  ];

  it('renders event details', () => {
    render(<EventCard event={baseEvent} votes={votes} />);
    expect(screen.getByText('Salsa Night')).toBeInTheDocument();
    expect(screen.getByText('2025-07-05')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Official')).toBeInTheDocument();
    expect(screen.getByText('Trusted Source')).toBeInTheDocument();
  });

  it('toggles details section', () => {
    render(<EventCard event={baseEvent} votes={votes} />);
    const detailsButton = screen.getByRole('button', { name: /details/i });
    fireEvent.click(detailsButton);
    expect(screen.getByText('Workshops')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide Details'));
    expect(screen.queryByText('Workshops')).not.toBeInTheDocument();
  });

  it('calls onVote when voting buttons are clicked', async () => {
    const onVote = jest.fn();
    render(<EventCard event={baseEvent} votes={votes} onVote={onVote} />);
    // Expand details first so voting buttons are visible
    const detailsButton = screen.getByRole('button', { name: /details/i });
    fireEvent.click(detailsButton);
    // Use getAllByRole to find the voting buttons
    const voteButtons = screen.getAllByRole('button');
    // Find the button for 'exists' and 'notexists' by partial text
    const existsBtn = voteButtons.find(btn => btn.textContent && btn.textContent.includes('really exists'));
    const notExistsBtn = voteButtons.find(btn => btn.textContent && btn.textContent.includes('doesn’t exist'));
    fireEvent.click(existsBtn);
    expect(onVote).toHaveBeenCalledWith('exists');
    fireEvent.click(notExistsBtn);
    expect(onVote).toHaveBeenCalledWith('notexists');
  });

  it('calls onToggleFavorite when favorite button is clicked', () => {
    const onToggleFavorite = jest.fn();
    render(<EventCard event={baseEvent} votes={votes} onToggleFavorite={onToggleFavorite} />);
    fireEvent.click(screen.getByText(/Save/i));
    expect(onToggleFavorite).toHaveBeenCalledWith(1);
  });

  it('shows correct favorite button state', () => {
    render(<EventCard event={baseEvent} votes={votes} isFavorite />);
    expect(screen.getByText('❤️ Saved')).toBeInTheDocument();
  });

  it('shows outdoor icon and weather warning for outdoor events', () => {
    const outdoorEvent = {
      ...baseEvent,
      venueType: 'outdoor',
      recurrence: 'This event takes place every Friday',
    };
    render(<EventCard event={outdoorEvent} votes={votes} />);
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    expect(screen.getByLabelText('outdoor')).toBeInTheDocument();
    expect(screen.getByText(/weather warning/i)).toBeInTheDocument();
    expect(screen.getByText(/This event takes place every Friday/)).toBeInTheDocument();
  });

  it('shows indoor icon for indoor events', () => {
    const indoorEvent = {
      ...baseEvent,
      venueType: 'indoor',
    };
    render(<EventCard event={indoorEvent} votes={votes} />);
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    expect(screen.getByLabelText('indoor')).toBeInTheDocument();
    expect(screen.queryByText(/weather warning/i)).not.toBeInTheDocument();
  });

  it('shows venue type voting when venueType is not specified', () => {
    const event = { ...baseEvent, venueType: undefined };
    const venueVotes = [
      { type: 'indoor', date: '2025-07-10', user_id: 'abc' },
      { type: 'outdoor', date: '2025-07-10', user_id: 'def' },
      { type: 'indoor', date: '2025-07-10', user_id: 'xyz' },
    ];
    render(
      <EventCard
        event={event}
        votes={votes}
        venueVotes={venueVotes}
        lastVenueVoted={null}
        onVenueVote={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    expect(screen.getByText('What type of venue is this event?')).toBeInTheDocument();
    expect(screen.getByLabelText('indoor')).toBeInTheDocument();
    expect(screen.getByLabelText('outdoor')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // indoor count
    expect(screen.getByText('1')).toBeInTheDocument(); // outdoor count
  });

  it('highlights user venue vote and calls onVenueVote', () => {
    const event = { ...baseEvent, venueType: undefined };
    const venueVotes = [
      { type: 'indoor', date: '2025-07-10', user_id: 'abc' },
      { type: 'outdoor', date: '2025-07-10', user_id: 'def' },
    ];
    const onVenueVote = jest.fn();
    render(
      <EventCard
        event={event}
        votes={votes}
        venueVotes={venueVotes}
        lastVenueVoted={'indoor'}
        onVenueVote={onVenueVote}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    const indoorBtn = screen.getByRole('button', { name: /indoor/i });
    expect(indoorBtn).toHaveStyle('opacity: 0.7');
    fireEvent.click(screen.getByRole('button', { name: /outdoor/i }));
    expect(onVenueVote).toHaveBeenCalledWith('outdoor');
  });
});
