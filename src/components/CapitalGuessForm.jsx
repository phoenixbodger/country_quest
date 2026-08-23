import React from 'react';

function CapitalGuessForm({ capitals, value, onChange, onGuess, disabled, placeholder = "Type a capital city..." }) {
  const normalized = (value || '').trim().toLowerCase();
  const validGuess = capitals.some(c => c.toLowerCase() === normalized);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validGuess || disabled) return;
    onGuess(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list="capital-list"
        disabled={disabled}
        style={{ padding: '10px', width: '250px', borderRadius: '5px', border: 'none', fontSize: '16px' }}
      />
      <datalist id="capital-list">
        {capitals.map((cap, idx) => (
          <option key={idx} value={cap} />
        ))}
      </datalist>
      <button
        type="submit"
        disabled={!validGuess || disabled}
        style={{
          padding: '10px 20px',
          marginLeft: '10px',
          borderRadius: '5px',
          border: 'none',
          background: validGuess && !disabled ? '#48bb78' : '#4a5568',
          color: 'white',
          cursor: validGuess && !disabled ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        Guess
      </button>
    </form>
  );
}

export default CapitalGuessForm;
