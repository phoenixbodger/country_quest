import React, { useState } from 'react';

function CountryQuestSetup({ onStart }) {
  const [numGames, setNumGames] = useState('5');
  const [customNumGames, setCustomNumGames] = useState('25');
  const [timeLimit, setTimeLimit] = useState('none');
  const [customTime, setCustomTime] = useState('45');
  const [silhouetteGuessLimit, setSilhouetteGuessLimit] = useState('6');
  const [customSilhouetteLimit, setCustomSilhouetteLimit] = useState('6');

  const getNumGamesValue = () => {
    if (numGames === 'unlimited') return null;
    if (numGames === 'custom') {
      const n = parseInt(customNumGames, 10);
      return Number.isFinite(n) && n > 0 ? n : 10;
    }
    return parseInt(numGames, 10);
  };

  const getTimeLimitValue = () => {
    if (timeLimit === 'none') return null;
    if (timeLimit === 'custom') {
      const n = parseInt(customTime, 10);
      return Number.isFinite(n) && n > 0 ? n : 30;
    }
    return parseInt(timeLimit, 10);
  };

  const getSilhouetteGuessLimitValue = () => {
    if (silhouetteGuessLimit === 'unlimited') return null;
    if (silhouetteGuessLimit === 'custom') {
      const n = parseInt(customSilhouetteLimit, 10);
      return Number.isFinite(n) && n > 0 ? n : 6;
    }
    return parseInt(silhouetteGuessLimit, 10);
  };

  const handleStart = () => {
    const payload = {
      numGames: getNumGamesValue(),
      timeLimitSec: getTimeLimitValue(),
      silhouetteGuessLimit: getSilhouetteGuessLimitValue(),
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
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '6px' }}>Setup Country Quest</div>
      <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '16px' }}>
        Choose how many quests to play and timer. Unlimited means play until you End Game.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        <div>
          <div style={labelStyle}>Number of quests</div>
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
          <div style={labelStyle}>Time limit per quest</div>
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
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>No timer = unlimited time per quest. Otherwise countdown per quest (silhouette + capital + flag); at 0 the quest is marked incorrect and the answer is revealed.</div>
        </div>

        <div>
          <div style={labelStyle}>Silhouette guess limit</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['3', '4', '5', '6', '8', '10', 'unlimited'].map(v => (
              <button
                key={v}
                onClick={() => setSilhouetteGuessLimit(v)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: silhouetteGuessLimit === v ? '#3182ce' : '#2d3748',
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
              onClick={() => setSilhouetteGuessLimit('custom')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: silhouetteGuessLimit === 'custom' ? '#3182ce' : '#2d3748',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Custom
            </button>
            {silhouetteGuessLimit === 'custom' && (
              <input
                type="number"
                min="1"
                max="20"
                value={customSilhouetteLimit}
                onChange={e => setCustomSilhouetteLimit(e.target.value)}
                style={{ ...selectStyle, width: '80px' }}
              />
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>Max guesses for silhouette stage. Unlimited = no limit. When limit reached, country is revealed and you continue to capital stage.</div>
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
        Start 🌍 Country Quest
      </button>
    </div>
  );
}

export default CountryQuestSetup;
