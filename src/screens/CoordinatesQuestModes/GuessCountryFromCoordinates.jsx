import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import { useBorderedEarthTexture } from '../../useBorderedEarthTexture';
import { buildCountryIndex, findNearestCountry } from '../../nearestCountry';
import { getProximityColor } from '../../distanceColors';

const getArrowEmoji = (dir) => {
  const arrows = { N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️', S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️' };
  return arrows[dir] || dir;
};

function GuessCountryFromCoordinates({ features, worldPolygons, target, sessionMaxGuesses, sessionRoundOver, sessionFailed, sessionFailReason, onSessionGuess, onSessionWin, onSessionFail, onFocusCountry }) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [globeSize, setGlobeSize] = useState(400);
  const [tried, setTried] = useState([]);
  const [guessCount, setGuessCount] = useState(0);
  const [lastHint, setLastHint] = useState(null);
  const [popup, setPopup] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showBorders, setShowBorders] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [showGraticule, setShowGraticule] = useState(false);
  const [highlightCountry, setHighlightCountry] = useState(null);
  const [lastGuessedCca3, setLastGuessedCca3] = useState(null);
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons);

  const targetCca3 = target?.properties?.cca3;
  const targetName = target?.properties?.name || targetCca3 || '';
  const targetCoords = target?.properties?.latlng ? { lat: target.properties.latlng[0], lng: target.properties.latlng[1] } : { lat: 0, lng: 0 };

  const countryIndex = useMemo(() => buildCountryIndex(features), [features]);

  // Reset per-round state when a new target is set (also guaranteed fresh by key remount in parent)
  useEffect(() => {
    setTried([]);
    setGuessCount(0);
    setLastHint(null);
    setPopup(null);
    setPopupPosition({ x: 20, y: 20 });
    setHighlightCountry(null);
    setLastGuessedCca3(null);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
  }, [targetCca3]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setGlobeSize(Math.min(el.clientWidth, 560));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reveal the answer on failure (timeout / skip / guess limit via parent state)
  useEffect(() => {
    if (sessionFailed && target && !(popup && popup.isFailure)) {
      setPopup({ cca3: targetCca3, name: targetName, lat: targetCoords.lat, lng: targetCoords.lng, isWin: false, isTried: false, isFailure: true });
    }
  }, [sessionFailed, target]);

  const resetPopupPosition = React.useCallback(() => {
    setPopupPosition({ x: 20, y: 20 });
  }, []);

  const handleDragStart = React.useCallback((clientX, clientY) => {
    setIsDragging(true);
    setDragOffset({ x: clientX - popupPosition.x, y: clientY - popupPosition.y });
  }, [popupPosition]);

  const handleDragMove = React.useCallback((clientX, clientY) => {
    if (!isDragging) return;
    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;
    const maxX = window.innerWidth - 300;
    const maxY = window.innerHeight - 150;
    setPopupPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = React.useCallback((e) => {
    if (e.button !== 0) return;
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleTouchStart = React.useCallback((e) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => handleDragEnd();
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const focusCountry = ({ lat, lng, cca3 }) => {
    if (cca3) setLastGuessedCca3(cca3);
    setHighlightCountry({ cca3, lat, lng });
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
    }
    if (onFocusCountry) onFocusCountry({ lat, lng, cca3 });
  };

  // A polygon/label click is an immediate guess.
  const handleGuessForCca3 = (cca3) => {
    if (!target) return;
    if (sessionRoundOver) return;
    const existing = tried.find(t => t.cca3 === cca3);
    if (existing) {
      setPopup({ cca3, name: existing.name, distanceKm: existing.distanceKm, direction: existing.direction, lat: existing.lat, lng: existing.lng, color: existing.color, isWin: false, isTried: true, alreadyGuessed: true });
      setLastHint(`${existing.name} is ${existing.distanceKm.toLocaleString()} km from the target ${getArrowEmoji(existing.direction)}.`);
      return;
    }
    const feat = features.find(f => f.properties.cca3 === cca3);
    if (!feat) return;
    const nextCount = guessCount + 1;
    setGuessCount(nextCount);
    setLastGuessedCca3(cca3);
    const name = feat.properties.name || cca3;
    const [cLat, cLng] = feat.properties.latlng || [targetCoords.lat, targetCoords.lng];
    if (cca3 === targetCca3) {
      setHighlightCountry({ cca3, lat: cLat, lng: cLng });
      setPopup({ cca3, name, lat: cLat, lng: cLng, isWin: true, isTried: false });
      if (onSessionWin) onSessionWin(nextCount);
      return;
    }
    const distanceKm = Math.round(getDistance(
      { latitude: cLat, longitude: cLng },
      { latitude: targetCoords.lat, longitude: targetCoords.lng }
    ) / 1000);
    const direction = getCompassDirection(
      { latitude: cLat, longitude: cLng },
      { latitude: targetCoords.lat, longitude: targetCoords.lng }
    );
    const color = getProximityColor(distanceKm);
    setTried(prev => [...prev, { cca3, name, distanceKm, direction, lat: cLat, lng: cLng, color }]);
    setLastHint(`${name} is ${distanceKm.toLocaleString()} km from the target ${getArrowEmoji(direction)}.`);
    setPopup({ cca3, name, distanceKm, direction, lat: cLat, lng: cLng, color, isWin: false, isTried: true });
    setHighlightCountry({ cca3, lat: cLat, lng: cLng });
    if (onSessionGuess) onSessionGuess(cca3, nextCount);
    const exhausted = sessionMaxGuesses != null && nextCount >= sessionMaxGuesses;
    if (exhausted && onSessionFail) {
      onSessionFail(nextCount);
    }
  };

  const handlePolygonClick = (polygon) => {
    const cca3 = polygon.properties?.cca3;
    if (!cca3) return;
    handleGuessForCca3(cca3);
  };

  const handleMissClick = ({ lat, lng }) => {
    const altitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    const toleranceKm = Math.min(600, Math.max(20, altitude * 200));
    const nearest = findNearestCountry(countryIndex, lat, lng);
    if (nearest && nearest.distanceKm <= toleranceKm) {
      handleGuessForCca3(nearest.cca3);
    }
  };

  const renderPopupElement = React.useCallback((d) => {
    if (!d) return null;
    const isWin = !!d.isWin;
    const isTried = !!d.isTried;
    const isFailure = !!d.isFailure;
    const alreadyGuessed = !!d.alreadyGuessed;
    const title = isWin ? `🎉 ${d.name}!` : isFailure ? `❌ ${d.name}` : d.name;
    const subtitle = isWin
      ? 'Correct!'
      : isFailure
        ? `Incorrect. End of Round. The country was ${d.name}.`
        : isTried
          ? `${d.distanceKm.toLocaleString()} km ${getArrowEmoji(d.direction)}`
          : '';
    const accentColor = isWin ? '#22c55e' : isFailure ? '#fc8181' : (d.color || '#3182ce');
    const textColor = isWin ? '#68d391' : isFailure ? '#fc8181' : (d.color || '#a0aec0');
    return (
      <div
        style={{
          background: '#1a202c',
          border: '1px solid #4a5568',
          borderLeft: `6px solid ${accentColor}`,
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '13px',
          lineHeight: '1.4',
          color: 'white',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          textAlign: 'left',
          minWidth: '240px',
          cursor: 'move',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: accentColor, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{title}</span>
            {d.cca3 && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#a0aec0', background: '#2d3748', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>{d.cca3}</span>
            )}
          </div>
          <button
            onClick={resetPopupPosition}
            style={{ background: 'transparent', border: 'none', color: '#a0aec0', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '2px 6px', borderRadius: '4px', opacity: 0.7 }}
            title="Reset position"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            ↻
          </button>
        </div>
        <div style={{ color: textColor, fontWeight: 'bold', marginTop: '6px' }}>{subtitle}</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {isTried && !alreadyGuessed && (
            <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: '#2d3748', color: '#a0aec0', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
              Already guessed ✗
            </div>
          )}
          {alreadyGuessed && (
            <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: '#2d3748', color: '#a0aec0', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
              Already guessed
            </div>
          )}
          {isWin && (
            <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#68d391', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
              Correct!
            </div>
          )}
          {isFailure && (
            <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: 'rgba(252,129,129,0.15)', border: '1px solid #fc8181', color: '#fc8181', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
              End of Round
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setPopup(null); }}
            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #4a5568', background: '#2d3748', color: '#a0aec0', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }, [resetPopupPosition]);

  if (!target) return <div style={{ color: '#a0aec0' }}>Loading...</div>;

  const labelsData = useMemo(() => {
    if (!showNames) return [];
    return worldPolygons
      .filter(f => f.properties?.name && f.properties?.latlng?.length === 2)
      .map(f => ({
        lat: f.properties.latlng[0],
        lng: f.properties.latlng[1],
        text: f.properties.name,
        cca3: f.properties.cca3,
      }));
  }, [worldPolygons, showNames]);

  const graticuleLabelsData = useMemo(() => {
    if (!showGraticule) return [];
    const labels = [];
    for (let lat = -80; lat <= 80; lat += 10) {
      if (lat === 0) continue;
      labels.push({ lat, lng: 0, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, type: 'graticule' });
      labels.push({ lat, lng: 180, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, type: 'graticule' });
    }
    for (let lng = -170; lng <= 170; lng += 20) {
      if (lng === 0) continue;
      labels.push({ lat: 0, lng, text: `${Math.abs(lng)}°${lng > 0 ? 'E' : 'W'}`, type: 'graticule' });
    }
    labels.push({ lat: 0, lng: 0, text: '0°', type: 'graticule' });
    labels.push({ lat: 0, lng: 180, text: '180°', type: 'graticule' });
    return labels;
  }, [showGraticule]);

  const allLabelsData = useMemo(() => [...labelsData, ...graticuleLabelsData], [labelsData, graticuleLabelsData]);

  const polygonData = useMemo(() => {
    return worldPolygons
      .filter(p => p.geometry && (p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'))
      .map(polygon => {
        const cca3 = (polygon.properties?.cca3 || '').toLowerCase();
        const tCca3 = (targetCca3 || '').toLowerCase();
        const isTarget = sessionRoundOver && tCca3 && tCca3 === cca3;
        const matched = tried.find(t => t.cca3.toLowerCase() === cca3);
        const isCurrent = lastGuessedCca3 && lastGuessedCca3.toLowerCase() === cca3;
        const isHighlighted = highlightCountry && highlightCountry.cca3 && highlightCountry.cca3.toLowerCase() === cca3;
        let color = 'rgba(0, 0, 0, 0)';
        let strokeColor = 'rgba(0, 0, 0, 0)';
        let altitude = 0.01;
        if (isHighlighted) {
          color = 'rgba(236, 72, 153, 0.4)';
          strokeColor = '#ec4899';
          altitude = 0.04;
        } else if (isCurrent) {
          strokeColor = '#ff00ff';
          color = 'rgba(255, 0, 255, 0.3)';
          altitude = 0.02;
        } else if (isTarget) {
          color = '#22c55e';
          strokeColor = '#000';
          altitude = 0.03;
        } else if (matched) {
          color = matched.color;
          strokeColor = '#000';
          altitude = 0.02;
        }
        return { ...polygon, cca3, color, strokeColor, altitude };
      });
  }, [worldPolygons, tried, sessionRoundOver, targetCca3, lastGuessedCca3, highlightCountry]);

  return (
    <div>
      <div style={{ margin: '10px 0 8px', fontSize: '18px', color: '#a0aec0' }}>
        Guess the country whose centre is at those coordinates
      </div>
      <p style={{ color: '#a0aec0', marginBottom: '10px', fontSize: '14px' }}>
        Rotate and click the globe to guess a country. Wrong guesses show the distance &amp; direction to the target's coordinates. Scroll to zoom — small islands get bigger and easier to click.
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showBorders} onChange={e => setShowBorders(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          Show borders
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          Show country names
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showGraticule} onChange={e => setShowGraticule(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          Show graticule
        </label>
      </div>

      <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '560px', position: 'relative' }}>
        <Globe
          ref={globeRef}
          width={globeSize}
          height={globeSize}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          globeImageUrl={showBorders && borderedGlobeUrl ? borderedGlobeUrl : `${import.meta.env.BASE_URL}earth-8k.jpg`}
          polygonsData={polygonData}
          polygonCapColor="color"
          polygonAltitude="altitude"
          polygonSideColor="rgba(0, 0, 0, 0)"
          polygonStrokeColor={(d) => d.strokeColor || 'rgba(0, 0, 0, 0)'}
          polygonHoverColor="rgba(37, 99, 235, 0.8)"
          polygonsTransitionDuration={300}
          polygonLabel={p => `<b>${p.properties?.name || ''}</b>`}
          onPolygonClick={handlePolygonClick}
          onGlobeClick={handleMissClick}
          htmlElementsData={allLabelsData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.015}
          htmlTransitionDuration={300}
          htmlElement={d => {
            const el = document.createElement('div');
            const isGraticule = d.type === 'graticule';
            el.style.color = isGraticule ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.95)';
            el.style.fontSize = isGraticule ? '10px' : '11px';
            el.style.fontWeight = isGraticule ? '500' : '700';
            el.style.whiteSpace = 'nowrap';
            el.style.pointerEvents = isGraticule ? 'none' : 'auto';
            el.style.cursor = isGraticule ? 'default' : 'pointer';
            el.style.userSelect = 'none';
            el.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';
            el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))';
            el.textContent = d.text;
            if (!isGraticule) {
              el.addEventListener('click', () => {
                handleGuessForCca3(d.cca3);
              });
            }
            return el;
          }}
          enableAutoRotate={false}
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.15}
          showGraticules={showGraticule}
        />
        {popup && (
          <div
            style={{
              position: 'absolute',
              left: popupPosition.x,
              top: popupPosition.y,
              zIndex: 10,
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {renderPopupElement(popup)}
          </div>
        )}
      </div>

      <div style={{ marginTop: '10px', color: '#f6ad55', fontSize: '16px' }}>{lastHint}</div>

      {tried.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '15px', color: '#a0aec0', marginBottom: '8px' }}>
            History — click a guess to centre the globe on it
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            {[...tried].reverse().map(t => (
              <button
                key={t.cca3}
                onClick={() => {
                  focusCountry({ lat: t.lat, lng: t.lng, cca3: t.cca3 });
                  setPopup({ cca3: t.cca3, name: t.name, lat: t.lat, lng: t.lng, distanceKm: t.distanceKm, direction: t.direction, color: t.color, isWin: false, isTried: true });
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  maxWidth: '420px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  borderLeft: `6px solid ${t.color}`,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                  {t.name}
                </span>
                <span style={{ color: t.color, fontWeight: 'bold' }}>{t.distanceKm.toLocaleString()} km {getArrowEmoji(t.direction)}</span>
              </button>
            ))}
            {sessionRoundOver && target && (
              <button
                key={`correct-${targetCca3}`}
                onClick={() => {
                  focusCountry({ lat: targetCoords.lat, lng: targetCoords.lng, cca3: targetCca3 });
                  setPopup({ cca3: targetCca3, name: targetName, lat: targetCoords.lat, lng: targetCoords.lng, isWin: true, isTried: false });
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  maxWidth: '420px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: 'rgba(236, 72, 153, 0.1)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  borderLeft: '6px solid #ec4899',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#ec4899', display: 'inline-block', flexShrink: 0 }} />
                  {targetName} <span style={{ color: '#ec4899', fontSize: '12px' }}>✓ Correct answer</span>
                </span>
                <span style={{ color: '#ec4899', fontWeight: 'bold' }}>—</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuessCountryFromCoordinates;
