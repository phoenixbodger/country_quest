import React, { useState, useEffect } from 'react';
import GameShell from '../components/GameShell';
import CountryGuessForm from '../components/CountryGuessForm';

function CapitalQuest({ onHome }) {
  const [countries, setCountries] = useState([]);
  const [target, setTarget] = useState(null);
  const [guessCount, setGuessCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries.json`)
      .then(r => r.json())
      .then(allCountries => {
        const sorted = allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
        const withCapital = sorted.filter(c => c.capital && c.capital.length > 0);
        setTarget(withCapital[Math.floor(Math.random() * withCapital.length)]);
      })
      .catch(err => console.error("Error loading countries:", err));
  }, []);

  const newGame = () => {
    const withCapital = countries.filter(c => c.capital && c.capital.length > 0);
    setTarget(withCapital[Math.floor(Math.random() * withCapital.length)]);
    setGuessCount(0);
    setGameWon(false);
  };

  const handleGuess = (country) => {
    if (gameWon) return;
    setGuessCount(n => n + 1);
    const sharesCapital = country.capital?.some(cap => target.capital?.includes(cap));
    if (country.name.common === target.name.common || sharesCapital) {
      setGameWon(true);
    }
  };

  return (
    <GameShell title="🏛️ Capital Quest" onHome={onHome}>
      {target && (
        <div style={{ margin: '30px 0' }}>
          <div style={{
            display: 'inline-block',
            background: '#2d3748',
            padding: '24px 40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>Capital city</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{target.capital[0]}</div>
          </div>
        </div>
      )}

      {gameWon && (
        <h2 style={{ color: '#48bb78' }}>
          🎉 Correct! The country was {target?.name?.common} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
        </h2>
      )}

      <CountryGuessForm
        countries={countries}
        onGuess={handleGuess}
        disabled={gameWon}
      />

      {gameWon && (
        <button
          onClick={newGame}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#48bb78',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Play again
        </button>
      )}
    </GameShell>
  );
}

export default CapitalQuest;