import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../components/FilterBar';

describe('FilterBar', () => {
  it('renders all dance style labels', () => {
    render(<FilterBar />);
    expect(screen.getByText('Salsa (undefined style)')).toBeInTheDocument();
    expect(screen.getByText('Salsa On 2')).toBeInTheDocument();
    expect(screen.getByText('Salsa L.A.')).toBeInTheDocument();
    expect(screen.getByText('Salsa Cubana')).toBeInTheDocument();
    expect(screen.getByText('Bachata (undefined style)')).toBeInTheDocument();
    expect(screen.getByText('Bachata Dominicana')).toBeInTheDocument();
    expect(screen.getByText('Bachata Sensual')).toBeInTheDocument();
    expect(screen.getByText('Kizomba')).toBeInTheDocument();
    expect(screen.getByText('Zouk')).toBeInTheDocument();
    expect(screen.getByText('Forró')).toBeInTheDocument();
  });
  it('allows selecting and deselecting a dance style', () => {
    render(<FilterBar />);
    const salsaLabel = screen.getByText('Salsa (undefined style)');
    fireEvent.click(salsaLabel);
    expect(salsaLabel.className).toMatch(/selected/);
    fireEvent.click(salsaLabel);
    expect(salsaLabel.className).not.toMatch(/selected/);
  });
  it('renders city and date inputs', () => {
    render(<FilterBar />);
    expect(screen.getByPlaceholderText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
  });
  it('renders the search button', () => {
    render(<FilterBar />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
