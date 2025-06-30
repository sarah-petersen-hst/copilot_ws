import React from 'react';
import coupleImg from '../assets/couple_small_LE_upscale_balanced_x4_2.png';
import '../styles/theme.css';

/**
 * Header image with headline for the Salsa Dance Event Finder site.
 * The image is cropped from the top and only 500px is visible. Shrinks on scroll (to be implemented).
 * @returns {JSX.Element} The header image component.
 */
function HeaderImage() {
  // Renders the header image and headline.
  return (
    <header style={{ position: 'relative', width: '100%', overflow: 'hidden', height: '500px', background: '#2d1818' }}>
      <img
        src={coupleImg}
        alt="Dancing couple"
        style={{ width: '100%', objectFit: 'cover', objectPosition: 'top', height: '500px', display: 'block' }}
      />
      <h1 style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#fff',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 600,
        fontSize: '2.5em',
        textShadow: '0 2px 12px rgba(0,0,0,0.4)',
        margin: 0,
        textAlign: 'center',
        width: '100%'
      }}>
        Find your Latin Dance Party
      </h1>
    </header>
  );
}

export default HeaderImage;
