import React from 'react';

export const FigmaToCodeIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left bracket <, inspired by Figma purple */}
    <path 
      d="M17 11L7 20L17 29L19 27L11.5 20L19 13L17 11Z" 
      fill="#A259FF"
    />
    {/* Right bracket >, inspired by Figma red */}
    <path 
      d="M23 11L33 20L23 29L21 27L28.5 20L21 13L23 11Z" 
      fill="#F24E1E"
    />
    {/* Slash /, inspired by Figma green and blue */}
    <path 
      d="M18 31L20 33L24 7L22 5L18 31Z" 
      fill="#0ACF83"
    />
  </svg>
);
