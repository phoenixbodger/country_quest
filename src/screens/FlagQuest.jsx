import React, { useState, useEffect } from 'react';
import GameShell from '../components/GameShell';
import CountryGuessForm from '../components/CountryGuessForm';

function FlagQuest({ onHome }) {
  const [countries, setCountries] = useState([]);
  const [target, setTarget] = useState(null);
  const [guessCount, setGuessCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [flagError, setFlagError] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries.json`)
      .then(r => r.json())
      .then(allCountries => {
        const sorted = allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
        setTarget(sorted[Math.floor(Math.random() * sorted.length)]);
      })
      .catch(err => console.error("Error loading countries:", err));
  }, []);

  const newGame = () => {
    setTarget(countries[Math.floor(Math.random() * countries.length)]);
    setGuessCount(0);
    setGameWon(false);
    setFlagError(false);
  };

  const handleGuess = (country) => {
    if (gameWon) return;
    setGuessCount(n => n + 1);
    if (country.name.common === target.name.common) {
      setGameWon(true);
    }
  };

  return (
    <GameShell title="🚩 Flag Quest" onHome={onHome}>
      {target && (
        <div style={{ margin: '20px 0' }}>
          <div style={{
            display: 'inline-block',
            background: '#2d3748',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          }}>
            {flagError ? (
              <span style={{ fontSize: '120px' }}>{target.flag}</span>
            ) : (
              <img
                src={`${import.meta.env.BASE_URL}maps/${target.cca3.toLowerCase()}.svg`}
                alt="Flag"
                onError={() => setFlagError(true)}
                style={{ width: '300px', height: '200px', objectFit: 'cover', borderRadius: '6px' }}
              />
            )}
          </div>
        </div>
      )}

      {gameWon && (
        <h2 style={{ color: '#48bb78' }}>
          🎉 Correct! It was {target?.name?.common} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
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

export default FlagQuest;