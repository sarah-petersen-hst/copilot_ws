import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventCard from '../components/EventCard';

const event = {
  id: 1,
  title: 'Salsa Night',
  date: '2025-07-05',
  address: '123 Main St',
  source: 'Official',
  trusted: true,
};

describe('EventCard', () => {
  it('renders event details', () => {
    render(<EventCard event={event} />);
    expect(screen.getByText('Salsa Night')).toBeInTheDocument();
    expect(screen.getByText('2025-07-05')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Official')).toBeInTheDocument();
    expect(screen.getByText('Trusted Source')).toBeInTheDocument();
  });
  it('toggles details section', () => {
    render(<EventCard event={event} />);
    const detailsButton = screen.getByRole('button', { name: /details/i });
    fireEvent.click(detailsButton);
    expect(screen.getByText(/Event details go here/)).toBeInTheDocument();
    fireEvent.click(detailsButton);
    expect(screen.queryByText(/Event details go here/)).not.toBeInTheDocument();
  });
});
