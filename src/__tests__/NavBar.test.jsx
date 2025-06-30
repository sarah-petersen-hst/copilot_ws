import React from 'react';
import { render, screen } from '@testing-library/react';
import NavBar from '../components/NavBar';

describe('NavBar', () => {
  it('renders main navigation items', () => {
    render(<NavBar />);
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Find Events')).toBeInTheDocument();
    expect(screen.getByText('Saved Events')).toBeInTheDocument();
    expect(screen.getByText('Legal Notice')).toBeInTheDocument();
  });
});
