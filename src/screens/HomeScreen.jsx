import React from 'react';

const GAMES = [
  {
    id: 'country',
    emoji: '🗺️',
    title: 'Country Quest',
    subtitle: 'Full Game',
    description: 'The ultimate challenge — guess the mystery country from its shape, then its capital, then its flag.',
  },
  {
    id: 'find',
    emoji: '🔍',
    title: 'Find Country Game',
    subtitle: '',
    description: 'We name a country — you hunt it on the 3D globe. Every miss gives distance & direction hints.',
  },
  {
    id: 'flag',
    emoji: '🚩',
    title: 'Flag Quest',
    subtitle: '',
    description: 'Two modes: match a flag to its country on the globe, or pick the right flag from six choices.',
  },
  {
    id: 'capital',
    emoji: '🏛️',
    title: 'Capital Quest',
    subtitle: '',
    description: 'Two modes: name the capital for a country, or guess the country from its capital on the globe.',
  },
  {
    id: 'globe',
    emoji: '🌐',
    title: 'Globe',
    subtitle: '',
    description: 'Free explore — spin, zoom, search and click any country to see its flag, capital, and facts.',
  },
];

function HomeScreen({ onSelect }) {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '42px', marginBottom: '8px' }}>🌍 Country Quest</h1>
      <p style={{ color: '#a0aec0', fontSize: '18px', marginBottom: '16px' }}>
        Pick a game to play
      </p>
      <button
        onClick={() => onSelect('howtoplay')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 22px',
          borderRadius: '999px',
          border: '1px solid #4a5568',
          background: '#2d3748',
          color: '#63b3ed',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 'bold',
          marginBottom: '28px',
          transition: 'background 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#4a5568';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#2d3748';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        📖 How to Play
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
      }}>
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '28px 20px',
              borderRadius: '12px',
              border: 'none',
              background: '#2d3748',
              color: 'white',
              cursor: 'pointer',
              transition: 'transform 0.15s, background 0.15s, box-shadow 0.15s',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#4a5568';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#2d3748';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.3)';
            }}
          >
            <span style={{ fontSize: '44px' }}>{game.emoji}</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {game.title}
              {game.subtitle && <span style={{ color: '#63b3ed' }}> ({game.subtitle})</span>}
            </span>
            <span style={{ color: '#a0aec0', fontSize: '14px', lineHeight: '1.4' }}>
              {game.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default HomeScreen;