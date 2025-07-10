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
});
