import React from 'react';

const formatLatLng = (lat, lng) => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
};

function CoordinatesQuestStats({ stats, config, onReplaySame, onChangeSettings, onHome, onCountryClick }) {
  const total = stats.history.length;
  const correct = stats.correct;
  const incorrect = stats.incorrect;
  const correctTotal = correct;

  const avgGuesses = total ? (stats.history.reduce((s, h) => s + h.guesses, 0) / total).toFixed(1) : '—';

  const modeLabel = '📍 Coordinates Quest';

  return (
    <div style={{ maxWidth: '640px', margin: '12px auto' }}>
      <div style={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>🏁 Session Stats</div>
        <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '14px' }}>
          Mode: {modeLabel} •{' '}
          {config.numGames == null ? '∞ Unlimited rounds' : `${config.numGames} rounds`}
          {' • '}
          {config.maxGuesses == null ? '∞ guesses' : `${config.maxGuesses} max guesses`}
          {' • '}
          {config.timeLimitSec == null ? 'No timer' : `${config.timeLimitSec}s timer`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
          <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Correct</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#48bb78' }}>{correct}</div>
            <div style={{ fontSize: '12px', color: '#68d391' }}>{total ? Math.round(correctTotal / total * 100) : 0}% accuracy</div>
          </div>
          <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Incorrect</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fc8181' }}>{incorrect}</div>
            <div style={{ fontSize: '12px', color: '#feb2b2' }}>skip / timeout / limit</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '13px', color: '#a0aec0', flexWrap: 'wrap' }}>
          <span>Total rounds: <b style={{ color: 'white' }}>{total}</b></span>
          <span>Correct: <b style={{ color: 'white' }}>{correctTotal}/{total}</b> {total ? `(${Math.round(correctTotal / total * 100)}%)` : ''}</span>
          <span>Avg guesses: <b style={{ color: 'white' }}>{avgGuesses}</b></span>
        </div>
      </div>

      {total > 0 && (
        <div style={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '12px', padding: '14px', marginBottom: '16px', overflowX: 'auto' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px', textAlign: 'left' }}>
            Per-round breakdown — click target coordinates to centre the globe
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#a0aec0', textAlign: 'left', borderBottom: '1px solid #2d3748' }}>
                <th style={{ padding: '6px 8px' }}>#</th>
                <th style={{ padding: '6px 8px' }}>Target Coordinates</th>
                <th style={{ padding: '6px 8px' }}>Result</th>
                <th style={{ padding: '6px 8px' }}>Guesses</th>
                <th style={{ padding: '6px 8px' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.map((h, i) => {
                const isCorrect = h.result === 'correct';
                const resultLabel = isCorrect ? 'Correct' : 'Incorrect';
                const resultColor = isCorrect ? '#48bb78' : '#fc8181';
                const isClickable = !isCorrect && h.targetLat != null && h.targetLng != null && h.targetCca3 && onCountryClick;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #2d3748', color: '#e2e8f0' }}>
                    <td style={{ padding: '6px 8px' }}>{h.idx}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {isClickable ? (
                        <span
                          style={{ color: '#ec4899', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => onCountryClick({ lat: h.targetLat, lng: h.targetLng, cca3: h.targetCca3, name: h.targetName })}
                        >
                          {formatLatLng(h.targetLat, h.targetLng)}
                        </span>
                      ) : (
                        formatLatLng(h.targetLat, h.targetLng)
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', color: resultColor, fontWeight: 'bold' }}>{resultLabel}</td>
                    <td style={{ padding: '6px 8px' }}>{h.guesses}</td>
                    <td style={{ padding: '6px 8px', color: '#a0aec0' }}>{h.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onReplaySame}
          style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#48bb78', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Play again (same settings)
        </button>
        <button
          onClick={onChangeSettings}
          style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #4a5568', background: '#2d3748', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Change settings
        </button>
        <button
          onClick={onHome}
          style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #4a5568', background: '#1a202c', color: '#a0aec0', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Home
        </button>
      </div>
    </div>
  );
}

export default CoordinatesQuestStats;
