import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useZoomControlsVisible } from '../useZoomControlsVisibility';

/**
 * GlobeZoomControls - Reusable zoom in/out buttons for react-globe.gl components.
 * Uses a zoom-multiplier ("x") scale where 1.0x = the comfortable zoom reference.
 *
 * The controls are collapsed/expanded via an inline toggle. Visibility is a shared,
 * persisted preference (see useZoomControlsVisibility), so it applies across all screens.
 *
 * @param {Object} props
 * @param {React.RefObject} props.globeRef - Ref to the Globe component
 * @param {number} [props.minAltitude=1.0] - Altitude at 1.0x zoom (the "comfortable" reference)
 * @param {number} [props.maxAltitude=3.0] - Maximum altitude (min x, fully zoomed out)
 * @param {number} [props.step=10] - Zoom step per click as a percentage (e.g. 10 = 10% per click)
 * @param {number} [props.transitionDuration=500] - Animation duration in ms
 * @param {string} [props.position='bottom-right'] - Position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 * @param {boolean} [props.allowZoomInput=true] - Whether to show the editable zoom readout
 * @param {boolean} [props.syncWithGlobeLimits=true] - Sync max zoom-in with globe's near-plane (texture detail) limit
 * @param {boolean} [props.show=true] - Hard override: pass false to never render the controls (and no toggle)
 */
function GlobeZoomControls({
  globeRef,
  minAltitude = 1.0,
  maxAltitude = 3.0,
  step = 10,
  transitionDuration = 500,
  position = 'bottom-right',
  allowZoomInput = true,
  syncWithGlobeLimits = true,
  show = true,
}) {
  // Shared + persisted show/hide preference (respects the explicit `show` hard override).
  const [controlsVisible, setControlsVisible] = useZoomControlsVisible();
  if (show === false) return null;

  const [currentX, setCurrentX] = useState(null); // current zoom multiplier, e.g. 1.4x
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [globeMaxAltitude, setGlobeMaxAltitude] = useState(null); // real zoom-out limit
  const currentXRef = useRef(null);
  const altitudeRef = useRef(null);
  const isMountedRef = useRef(true);

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' },
  };

  const containerStyle = {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    zIndex: 10,
    pointerEvents: 'auto',
    ...positionStyles[position],
  };

  const buttonStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(15, 23, 42, 0.9)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.15s ease',
    lineHeight: 1,
  };

  // Input / readout style
  const inputStyle = {
    width: '56px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(15, 23, 42, 0.9)',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    outline: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.15s ease',
    padding: '0 8px',
    appearance: 'textfield',
    MozAppearance: 'textfield',
  };

  // Fetch actual zoom-out limit from globe's OrbitControls
  const fetchGlobeLimits = useCallback(() => {
    if (!globeRef.current || !syncWithGlobeLimits) return;
    try {
      const controls = globeRef.current.controls();
      const globeRadius = globeRef.current.getGlobeRadius();
      if (controls && globeRadius) {
        // OrbitControls uses distance from center; convert max distance to altitude
        const maxAlt = controls.maxDistance / globeRadius;
        if (maxAlt > 1) {
          setGlobeMaxAltitude(maxAlt);
        }
      }
    } catch (e) {
      // Globe not ready or controls not available
    }
  }, [globeRef, syncWithGlobeLimits]);

  // Sync altitude from globe on mount and periodically
  useEffect(() => {
    isMountedRef.current = true;

    // Try to fetch globe limits once globe is ready
    const tryFetchLimits = () => {
      if (globeRef.current) {
        fetchGlobeLimits();
      }
    };

    // Initial attempt
    tryFetchLimits();

    // Retry a few times as globe may not be ready immediately
    let attempts = 0;
    const retryInterval = setInterval(() => {
      attempts++;
      if (attempts > 10 || globeMaxAltitude != null) {
        clearInterval(retryInterval);
      } else {
        tryFetchLimits();
      }
    }, 200);

    const updateAltitude = () => {
      if (!globeRef.current || !isMountedRef.current) return;
      try {
        const pov = globeRef.current.pointOfView();
        if (pov && typeof pov.altitude === 'number') {
          altitudeRef.current = pov.altitude;
          const newX = clampX(minAltitude / pov.altitude);
          currentXRef.current = newX;
          setCurrentX(newX);
          // Update readout when altitude changes externally (not while user is typing)
          if (!isInputFocused) {
            setInputValue(formatX(newX));
          }
        }
      } catch (e) {
        // Globe not ready yet
      }
    };

    updateAltitude();
    const interval = setInterval(updateAltitude, 1000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      clearInterval(retryInterval);
    };
  }, [globeRef, fetchGlobeLimits, isInputFocused, globeMaxAltitude]);

  // --- Effective altitude limits (x-scale) ---
  // Zoom-out is bounded by the maxAltitude prop (whole-globe view). The globe's own
  // max is enormous (~100x radius) and useless here, so we clamp to the prop.
  const effectiveMaxAltitude = Math.min(maxAltitude, globeMaxAltitude != null ? globeMaxAltitude : maxAltitude);
  // No imposed maximum zoom-in: let the camera keep zooming deep toward (but just
  // above) the globe center, where it finally stops. This avoids a divide-by-zero
  // while removing any artificial cap.
  const minAltitudeFloor = 0.02;

  const getCurrentPOV = useCallback(() => {
    if (!globeRef.current) return null;
    try {
      return globeRef.current.pointOfView();
    } catch (e) {
      return null;
    }
  }, [globeRef]);

  // --- Conversion helpers (x = magnification relative to the comfortable 1.0x view) ---
  // x = minAltitude / altitude  →  1.0x at minAltitude, < 1.0x further out, > 1.0x further in.
  const maxX = minAltitude / minAltitudeFloor; // effectively no maximum
  const minX = minAltitude / effectiveMaxAltitude; // zoom-out limit (whole globe)

  const clampX = useCallback((x) => Math.min(maxX, Math.max(minX, x)), [maxX, minX]);
  const xToAltitude = useCallback((x) => minAltitude / x, [minAltitude]);
  const formatX = useCallback((x) => `${x.toFixed(1)}x`, []);

  const zoom = useCallback((direction) => {
    if (!globeRef.current) return;

    const pov = getCurrentPOV();
    const curAlt = altitudeRef.current ?? pov?.altitude ?? minAltitude;
    const curX = clampX(minAltitude / curAlt);
    // Multiplicative step: each click scales the magnification by ~10% for a consistent zoom feel.
    const factor = Math.max(1.01, 1 + step / 100);
    const newX = direction === 'in'
      ? Math.min(maxX, curX * factor)
      : Math.max(minX, curX / factor);

    if (Math.abs(newX - curX) < 1e-6) return;

    const newAlt = xToAltitude(newX);
    altitudeRef.current = newAlt;
    currentXRef.current = newX;
    setCurrentX(newX);

    globeRef.current.pointOfView(
      {
        lat: pov?.lat ?? 0,
        lng: pov?.lng ?? 0,
        altitude: newAlt,
      },
      transitionDuration
    );
  }, [globeRef, getCurrentPOV, minAltitude, maxX, minX, clampX, xToAltitude, step, transitionDuration]);

  const zoomIn = useCallback(() => zoom('in'), [zoom]);
  const zoomOut = useCallback(() => zoom('out'), [zoom]);

  // Current zoom multiplier (fallback to 1.0x)
  const currentZoom = currentX != null ? currentX : 1;

  // Handle input change - allow decimals and an optional 'x' suffix
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*x?$/i.test(value)) {
      setInputValue(value);
    }
  }, []);

  // Handle input blur - apply zoom
  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    const str = inputValue.replace(/x$/i, '').trim();
    const val = parseFloat(str);
    if (!isNaN(val) && val > 0 && globeRef.current) {
      const newX = clampX(val);
      const newAlt = xToAltitude(newX);
      altitudeRef.current = newAlt;
      currentXRef.current = newX;
      setCurrentX(newX);
      const pov = getCurrentPOV();
      globeRef.current.pointOfView(
        {
          lat: pov?.lat ?? 0,
          lng: pov?.lng ?? 0,
          altitude: newAlt,
        },
        transitionDuration
      );
      setInputValue(formatX(newX));
    } else {
      // Restore current zoom readout on invalid input
      setInputValue(formatX(currentXRef.current ?? 1));
    }
  }, [inputValue, globeRef, getCurrentPOV, xToAltitude, clampX, formatX, transitionDuration]);

  // Handle Enter key - apply zoom
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      // Restore current value on Escape
      setInputValue(formatX(currentXRef.current ?? 1));
      e.target.blur();
    }
  }, [formatX]);

  // Handle focus - select all text for easy replacement
  const handleFocus = useCallback((e) => {
    setIsInputFocused(true);
    e.target.select();
  }, []);

  const atMaxZoom = currentX != null && currentX >= maxX - 1e-6;
  const atMinZoom = currentX != null && currentX <= minX + 1e-6;

  // Collapse / expand toggle — slightly smaller than the zoom buttons.
  const toggleButtonStyle = {
    ...buttonStyle,
    width: '32px',
    height: '32px',
    fontSize: '16px',
    alignSelf: 'center',
  };

  return controlsVisible ? (
    <div style={containerStyle}>
      <button
        onClick={zoomIn}
        style={{
          ...buttonStyle,
          opacity: atMaxZoom ? 0.4 : 1,
          cursor: atMaxZoom ? 'not-allowed' : 'pointer',
        }}
        disabled={atMaxZoom}
        aria-label="Zoom in"
        title={`Zoom in (max ${formatX(maxX)})`}
      >
        +
      </button>

      {/* Zoom readout / input (between buttons) */}
      {allowZoomInput && (
        <input
          type="text"
          value={inputValue || formatX(currentZoom)}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          style={inputStyle}
          placeholder={formatX(currentZoom)}
          aria-label="Zoom multiplier"
          title={`Zoom ${formatX(minX)}–${formatX(maxX)} (1.0x = comfortable view)`}
        />
      )}

      <button
        onClick={zoomOut}
        style={{
          ...buttonStyle,
          opacity: atMinZoom ? 0.4 : 1,
          cursor: atMinZoom ? 'not-allowed' : 'pointer',
        }}
        disabled={atMinZoom}
        aria-label="Zoom out"
        title={`Zoom out (min ${formatX(minX)})`}
      >
        −
      </button>

      <button
        onClick={() => setControlsVisible(false)}
        style={toggleButtonStyle}
        aria-label="Hide zoom controls"
        title="Hide zoom controls"
      >
        ⌄
      </button>
    </div>
  ) : (
    <div style={containerStyle}>
      <button
        onClick={() => setControlsVisible(true)}
        style={buttonStyle}
        aria-label="Show zoom controls"
        title="Show zoom controls"
      >
        🔍
      </button>
    </div>
  );
}

export default GlobeZoomControls;