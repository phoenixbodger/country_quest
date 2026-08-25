import React from 'react';

function HintChoices({ options, correct, triedSet, onPick, disabled }) {
  // triedSet is Set of lower/cca3 already tried wrong
  const isTried = (opt) => {
    if (!triedSet) return false;
    const key = opt.cca3 || opt.toLowerCase?.() || String(opt).toLowerCase();
    return triedSet.has(String(key).toLowerCase()) || triedSet.has(key);
  };

  const isCorrectKey = (opt) => {
    if (!correct) return false;
    const optKey = (opt.cca3 ? opt.cca3 : opt).toLowerCase();
    const corKey = (correct.cca3 ? correct.cca3 : correct).toLowerCase();
    return optKey === corKey;
  };

  const colCount = options.length > 4 ? 3 : 2;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${colCount}, 1fr)`,
      gap: '10px',
      maxWidth: options.length > 4 ? '520px' : '420px',
      margin: '12px auto',
    }}>
      {options.map((opt, idx) => {
        const label = opt.name || opt;
        const tried = isTried(opt);
        const isCorrect = isCorrectKey(opt);
        // never disable correct even if tried (should not happen)
        const btnDisabled = disabled || (tried && !isCorrect);
        return (
          <button
            key={idx}
            onClick={() => onPick(opt)}
            disabled={btnDisabled}
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #4a5568',
              background: tried ? '#4a5568' : '#2d3748',
              color: tried ? '#a0aec0' : 'white',
              cursor: btnDisabled ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              opacity: tried ? 0.6 : 1,
            }}
          >
            {label} {tried && ' ✗'}
          </button>
        );
      })}
    </div>
  );
}

export default HintChoices;
