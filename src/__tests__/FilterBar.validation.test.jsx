import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../components/FilterBar';

/**
 * Unit tests for city input validation in FilterBar.
 * Ensures only valid city names are accepted and invalid input is blocked.
 */
describe('FilterBar city input validation', () => {
  it('accepts valid city names', () => {
    render(<FilterBar />);
    const cityInput = screen.getByPlaceholderText('City');
    fireEvent.change(cityInput, { target: { value: 'Berlin' } });
    expect(cityInput.value).toBe('Berlin');
    fireEvent.change(cityInput, { target: { value: "São Paulo" } });
    expect(cityInput.value).toBe('São Paulo');
    fireEvent.change(cityInput, { target: { value: "St-Germain-en-Laye" } });
    expect(cityInput.value).toBe('St-Germain-en-Laye');
  });

  it('blocks invalid city names and shows alert', () => {
    window.alert = jest.fn();
    render(<FilterBar />);
    const cityInput = screen.getByPlaceholderText('City');
    fireEvent.change(cityInput, { target: { value: 'Berlin123' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(window.alert).toHaveBeenCalledWith(
      'Please enter a valid city name (letters, spaces, hyphens only).'
    );
  });
});
