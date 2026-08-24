import React from 'react';

function FlagQuestStats({ stats, config, mode, onReplaySame, onChangeSettings, onHome }) {
  const total = stats.history.length;
  const correct = stats.correct;
  const correctHint = stats.correctWithHint;
  const incorrect = stats.incorrect;
  const correctTotal = correct + correctHint;

  const avgGuesses = total ? (stats.history.reduce((s, h) => s + h.guesses, 0) / total).toFixed(1) : '—';

  return (
    <div style={{ maxWidth: '640px', margin: '12px auto' }}>
      <div style={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>🏁 Session Stats</div>
        <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '14px' }}>
          Mode: {mode === 'country' ? '🌍 Guess the Country' : '🏳️ Guess the Flag'} •{' '}
          {config.numGames == null ? '∞ Unlimited' : `${config.numGames} games`}
          {' • '}
          {config.maxGuesses == null ? '∞ guesses' : `${config.maxGuesses} max guesses`}
          {' • '}
          {config.timeLimitSec == null ? 'No timer' : `${config.timeLimitSec}s timer`}
          {mode === 'flag' && config.numChoices != null ? ` • ${config.numChoices} choices` : ''}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
          <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Correct</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#48bb78' }}>{correct}</div>
            <div style={{ fontSize: '12px', color: '#68d391' }}>without hint</div>
          </div>
          <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Correct</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#63b3ed' }}>{correctHint}</div>
            <div style={{ fontSize: '12px', color: '#63b3ed' }}>hint used</div>
          </div>
          <div style={{ background: '#2d3748', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Incorrect</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fc8181' }}>{incorrect}</div>
            <div style={{ fontSize: '12px', color: '#feb2b2' }}>skip / timeout / limit</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '13px', color: '#a0aec0', flexWrap: 'wrap' }}>
          <span>Total: <b style={{ color: 'white' }}>{total}</b></span>
          <span>Correct total: <b style={{ color: 'white' }}>{correctTotal}/{total}</b> {total ? `(${Math.round(correctTotal / total * 100)}%)` : ''}</span>
          <span>Avg guesses: <b style={{ color: 'white' }}>{avgGuesses}</b></span>
        </div>
      </div>

      {total > 0 && (
        <div style={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '12px', padding: '14px', marginBottom: '16px', overflowX: 'auto' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px', textAlign: 'left' }}>Per-question breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#a0aec0', textAlign: 'left', borderBottom: '1px solid #2d3748' }}>
                <th style={{ padding: '6px 8px' }}>#</th>
                <th style={{ padding: '6px 8px' }}>Target</th>
                <th style={{ padding: '6px 8px' }}>Result</th>
                <th style={{ padding: '6px 8px' }}>Guesses</th>
                <th style={{ padding: '6px 8px' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.map((h, i) => {
                let resultLabel = '';
                let resultColor = '';
                if (h.result === 'correct') { resultLabel = 'Correct'; resultColor = '#48bb78'; }
                else if (h.result === 'correct_hint') { resultLabel = 'Correct (hint used)'; resultColor = '#63b3ed'; }
                else { resultLabel = 'Incorrect'; resultColor = '#fc8181'; }
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #2d3748', color: '#e2e8f0' }}>
                    <td style={{ padding: '6px 8px' }}>{h.idx}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{h.targetName}</td>
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

export default FlagQuestStats;
