import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventCard from '../components/EventCard';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Favorites Functionality', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  const mockEvent = {
    id: 1,
    title: 'Test Salsa Event',
    date: '2025-07-15',
    address: '123 Dance St',
    source: 'test-source.com',
    trusted: true,
    workshops: [
      { style: 'Salsa L.A.', level: 'Intermediate', start: '19:00', end: '20:00' }
    ],
    party: {
      start: '21:00',
      end: '02:00',
      floors: [{ description: 'Main floor with salsa music' }]
    }
  };

  test('renders favorite button with correct initial state', () => {
    const mockOnToggleFavorite = jest.fn();
    
    render(
      <EventCard 
        event={mockEvent}
        votes={[]}
        onVote={jest.fn()}
        lastVoted={null}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    const saveButton = screen.getByText('🤍 Save');
    expect(saveButton).toBeInTheDocument();
  });

  test('renders favorite button as saved when isFavorite is true', () => {
    const mockOnToggleFavorite = jest.fn();
    
    render(
      <EventCard 
        event={mockEvent}
        votes={[]}
        onVote={jest.fn()}
        lastVoted={null}
        isFavorite={true}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    const saveButton = screen.getByText('❤️ Saved');
    expect(saveButton).toBeInTheDocument();
  });

  test('calls onToggleFavorite when favorite button is clicked', () => {
    const mockOnToggleFavorite = jest.fn();
    
    render(
      <EventCard 
        event={mockEvent}
        votes={[]}
        onVote={jest.fn()}
        lastVoted={null}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />
    );

    const saveButton = screen.getByText('🤍 Save');
    fireEvent.click(saveButton);
    
    expect(mockOnToggleFavorite).toHaveBeenCalledWith(mockEvent.id);
  });
});
