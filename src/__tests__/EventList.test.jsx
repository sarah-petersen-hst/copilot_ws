import React from 'react';
import { render, screen } from '@testing-library/react';
import EventList from '../components/EventList';

const events = [
  {
    id: 1,
    title: 'Salsa Night',
    date: '2025-07-05',
    address: '123 Main St',
    source: 'Official',
    trusted: true,
  },
];

describe('EventList', () => {
  it('renders the heading', () => {
    render(<EventList events={events} />);
    expect(screen.getByText('Found Events')).toBeInTheDocument();
  });
  it('renders event cards', () => {
    render(<EventList events={events} />);
    expect(screen.getByText('Salsa Night')).toBeInTheDocument();
  });
  it('shows no events message if list is empty', () => {
    render(<EventList events={[]} />);
    expect(screen.getByText('No events found.')).toBeInTheDocument();
  });
});
