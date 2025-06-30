import React from 'react';
import { render, screen } from '@testing-library/react';
import HeaderImage from '../components/HeaderImage';

describe('HeaderImage', () => {
  it('renders the headline', () => {
    render(<HeaderImage />);
    expect(screen.getByText('Find your Latin Dance Party')).toBeInTheDocument();
  });
  it('renders the image with alt text', () => {
    render(<HeaderImage />);
    expect(screen.getByAltText('Dancing couple')).toBeInTheDocument();
  });
});
