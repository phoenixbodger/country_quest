import React, { useState } from 'react';

function FindCountrySetup({ onStart }) {
  const [numGames, setNumGames] = useState('10'); // '5','10','15','20','unlimited','custom'
  const [customNumGames, setCustomNumGames] = useState('25');
  const [maxGuesses, setMaxGuesses] = useState('unlimited');
  const [customGuesses, setCustomGuesses] = useState('5');
  const [timeLimit, setTimeLimit] = useState('none'); // 'none','15','30','60','120','custom'
  const [customTime, setCustomTime] = useState('45');

  const getNumGamesValue = () => {
    if (numGames === 'unlimited') return null;
    if (numGames === 'custom') {
      const n = parseInt(customNumGames, 10);
      return Number.isFinite(n) && n > 0 ? n : 10;
    }
    return parseInt(numGames, 10);
  };

  const getMaxGuessesValue = () => {
    if (maxGuesses === 'unlimited') return null;
    if (maxGuesses === 'custom') {
      const n = parseInt(customGuesses, 10);
      return Number.isFinite(n) && n > 0 ? n : 5;
    }
    return parseInt(maxGuesses, 10);
  };

  const getTimeLimitValue = () => {
    if (timeLimit === 'none') return null;
    if (timeLimit === 'custom') {
      const n = parseInt(customTime, 10);
      return Number.isFinite(n) && n > 0 ? n : 30;
    }
    return parseInt(timeLimit, 10);
  };

  const handleStart = () => {
    const payload = {
      numGames: getNumGamesValue(),
      maxGuesses: getMaxGuessesValue(),
      timeLimitSec: getTimeLimitValue(),
      numChoices: null,
    };
    onStart(payload);
  };

  const selectStyle = {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #4a5568',
    background: '#2d3748',
    color: 'white',
    fontSize: '14px',
  };

  const labelStyle = { color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', textAlign: 'left', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '520px', margin: '10px auto', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '12px', padding: '18px' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '6px' }}>Setup Find Country</div>
      <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '16px' }}>
        Choose how many countries to find, guess limits and timer. Unlimited means play until you End Game.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        <div>
          <div style={labelStyle}>Number of Countries to Find</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['5', '10', '15', '20', 'unlimited'].map(v => (
              <button
                key={v}
                onClick={() => setNumGames(v)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: numGames === v ? '#3182ce' : '#2d3748',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {v === 'unlimited' ? '∞ Unlimited' : v}
              </button>
            ))}
            <button
              onClick={() => setNumGames('custom')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: numGames === 'custom' ? '#3182ce' : '#2d3748',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Custom
            </button>
            {numGames === 'custom' && (
              <input
                type="number"
                min="1"
                max="200"
                value={customNumGames}
                onChange={e => setCustomNumGames(e.target.value)}
                style={{ ...selectStyle, width: '80px' }}
              />
            )}
          </div>
        </div>

        <div>
          <div style={labelStyle}>Guesses per country (max)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['unlimited', '1', '3', '5', '10'].map(v => (
              <button
                key={v}
                onClick={() => setMaxGuesses(v)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: maxGuesses === v ? '#3182ce' : '#2d3748',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {v === 'unlimited' ? '∞ Unlimited' : `${v} ${parseInt(v, 10) === 1 ? 'guess' : 'guesses'}`}
              </button>
            ))}
            <button
              onClick={() => setMaxGuesses('custom')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: maxGuesses === 'custom' ? '#3182ce' : '#2d3748',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Custom
            </button>
            {maxGuesses === 'custom' && (
              <input
                type="number"
                min="1"
                max="50"
                value={customGuesses}
                onChange={e => setCustomGuesses(e.target.value)}
                style={{ ...selectStyle, width: '80px' }}
              />
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            If limit reached without correct answer, it is marked incorrect and the answer is revealed.
          </div>
        </div>

        <div>
          <div style={labelStyle}>Time limit per country</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['none', '15', '30', '60', '120'].map(v => (
              <button
                key={v}
                onClick={() => setTimeLimit(v)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: timeLimit === v ? '#3182ce' : '#2d3748',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {v === 'none' ? 'No timer' : `${v}s`}
              </button>
            ))}
            <button
              onClick={() => setTimeLimit('custom')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: timeLimit === 'custom' ? '#3182ce' : '#2d3748',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Custom
            </button>
            {timeLimit === 'custom' && (
              <input
                type="number"
                min="5"
                max="600"
                value={customTime}
                onChange={e => setCustomTime(e.target.value)}
                style={{ ...selectStyle, width: '80px' }}
              />
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>No timer = unlimited time per country. Otherwise countdown; at 0 the answer is revealed as incorrect.</div>
        </div>
      </div>

      <button
        onClick={handleStart}
        style={{
          marginTop: '18px',
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          border: 'none',
          background: '#48bb78',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
        }}
      >
        Start 🔍 Find Country
      </button>
    </div>
  );
}

export default FindCountrySetup;
