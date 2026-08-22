import React, { useState } from 'react';

function CountryGuessForm({ countries, onGuess, disabled }) {
  const [guess, setGuess] = useState("");
  const validGuess = countries.some(c => c.name.common.toLowerCase() === guess.toLowerCase());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validGuess || disabled) return;
    const country = countries.find(c => c.name.common.toLowerCase() === guess.toLowerCase());
    onGuess(country);
    setGuess("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
      <input
        type="text"
        value={guess}
        onChange={e => setGuess(e.target.value)}
        placeholder="Type a country name..."
        list="country-list"
        disabled={disabled}
        style={{ padding: '10px', width: '250px', borderRadius: '5px', border: 'none', fontSize: '16px' }}
      />

      <datalist id="country-list">
        {countries.map((c, idx) => (
          <option key={idx} value={c.name.common} />
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

export default CountryGuessForm;