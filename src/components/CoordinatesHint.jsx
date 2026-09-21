import React, { useState } from 'react';
import { formatLatLng } from '../utils/formatCoords';

// A reveal-on-click hint that shows the target country's coordinates.
// `lat` / `lng` are the country's coordinates. `onUsed` (optional) is invoked
// exactly once, the first time the hint is revealed (for session hint tracking).
// `disabled` hides/prevents the hint (e.g. after the round ends).
function CoordinatesHint({ lat, lng, onUsed = null, disabled = false }) {
  const [revealed, setRevealed] = useState(false);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    if (onUsed) onUsed();
  };

  if (disabled) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {!revealed && (
        <button
          onClick={reveal}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #4a5568',
            background: '#2d3748',
            color: '#63b3ed',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          📍 Coordinates hint
        </button>
      )}
      {revealed && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>Coordinates of the country:</div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#63b3ed',
              fontFamily: 'monospace',
            }}
          >
            {formatLatLng(lat, lng)}
          </div>
          <button
            onClick={() => setRevealed(false)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: '#4a5568',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Hide hint
          </button>
        </div>
      )}
    </div>
  );
}

export default CoordinatesHint;