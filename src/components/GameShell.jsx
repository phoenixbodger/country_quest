import React from 'react';

function GameShell({ title, onHome, children }) {
  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ textAlign: 'left', marginBottom: '10px' }}>
        <button
          onClick={onHome}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: '#2d3748',
            color: 'white',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
        >
          ← Home
        </button>
      </div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export default GameShell;
