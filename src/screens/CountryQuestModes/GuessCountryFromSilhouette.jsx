import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import CountryOutline from '../../CountryOutline';
import HintChoices from '../../components/HintChoices';
import { useBorderedEarthTexture } from '../../useBorderedEarthTexture';
import { buildCountryIndex, findNearestCountry } from '../../nearestCountry';
import { shuffleArray } from '../../utils/capitalHelpers';
import { getProximityColor } from '../../distanceColors';

function GuessCountryFromSilhouette({ countries, features, worldPolygons, target, onWon, onGuessCountChange, disabled }) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [globeSize, setGlobeSize] = useState(400);
  const [guessValue, setGuessValue] = useState('');
  const [tried, setTried] = useState([]);
  const [guessCount, setGuessCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [lastHint, setLastHint] = useState(null);
  const [showBorders, setShowBorders] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintOptions, setHintOptions] = useState([]);
  const [hintTried, setHintTried] = useState(new Set());
  const [advancing, setAdvancing] = useState(false);
  const [popup, setPopup] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons);

  // Reset when target changes
  useEffect(() => {
    setTried([]);
    setGuessCount(0);
    setGameWon(false);
    setLastHint(null);
    setShowHint(false);
    setHintOptions([]);
    setHintTried(new Set());
    setGuessValue('');
    setAdvancing(false);
    setPopup(null);
    setPopupPosition({ x: 20, y: 20 });
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
  }, [target?.properties?.cca3, target?.cca3]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setGlobeSize(Math.min(el.clientWidth, 560));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const countryIndex = useMemo(() => buildCountryIndex(features), [features]);

  const getArrowEmoji = (dir) => {
    const arrows = { N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️', S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️' };
    return arrows[dir] || dir;
  };

  const handleWin = (nextCount) => {
    setGameWon(true);
    setLastHint(null);
    setShowHint(false);
    setAdvancing(true);
    if (onGuessCountChange) onGuessCountChange(nextCount);
    if (onWon) {
      // parent will auto-advance after 2s
      onWon(nextCount);
    }
  };

  const handleGuessByCca3 = (cca3) => {
    if (disabled || gameWon || tried.some(t => t.cca3 === cca3)) return;
    const nextCount = guessCount + 1;
    setGuessCount(nextCount);
    if (onGuessCountChange) onGuessCountChange(nextCount);
    // target is a geo feature with properties.cca3, but parent may pass country obj with cca3
    const targetCca3 = target?.properties?.cca3 || target?.cca3;
    if (cca3 === targetCca3) {
      const winFeat = features.find(f => f.properties.cca3 === cca3);
      const winCountry = countries.find(c => c.cca3 === cca3);
      const [wLat, wLng] = winCountry?.latlng || winFeat?.properties?.latlng || target?.properties?.latlng || [0, 0];
      setPopup({ cca3, name: winFeat ? winFeat.properties.name : cca3, lat: wLat, lng: wLng, isWin: true, isTried: false });
      handleWin(nextCount);
      return;
    }
    const clicked = features.find(f => f.properties.cca3 === cca3);
    const targetCountry = countries.find(c => c.cca3 === targetCca3);
    const clickedCountry = countries.find(c => c.cca3 === cca3);
    // fallback to feature latlng
    const clickedFeature = clicked || features.find(f => f.properties.cca3 === cca3);
    const targetFeature = features.find(f => f.properties.cca3 === targetCca3);
    const [tLat, tLng] = targetCountry?.latlng || targetFeature?.properties?.latlng || target?.properties?.latlng || [0, 0];
    const [cLat, cLng] = clickedCountry?.latlng || clickedFeature?.properties?.latlng || [0, 0];
    const distanceKm = Math.round(getDistance(
      { latitude: cLat, longitude: cLng },
      { latitude: tLat, longitude: tLng }
    ) / 1000);
    const direction = getCompassDirection(
      { latitude: cLat, longitude: cLng },
      { latitude: tLat, longitude: tLng }
    );
    const color = getProximityColor(distanceKm);
    const name = clicked?.properties?.name || clickedCountry?.name?.common || cca3;
    setTried(prev => [...prev, { cca3, name, distanceKm, direction, lat: cLat, lng: cLng, color }]);
    setLastHint(`${name} is ${distanceKm.toLocaleString()} km from the target ${getArrowEmoji(direction)}.`);
    setPopup({ cca3, name, distanceKm, direction, lat: cLat, lng: cLng, color, isWin: false, isTried: true });
  };

  const handleSubmitCountry = (country) => {
    if (disabled || gameWon) return;
    handleGuessByCca3(country.cca3);
    setGuessValue('');
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = guessValue.trim();
    if (!trimmed) return;
    const found = countries.find(c => c.name.common.toLowerCase() === trimmed.toLowerCase());
    if (!found) return;
    handleSubmitCountry(found);
  };

  const focusCountry = ({ lat, lng }) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
    }
  };

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

  const handlePopupConfirm = React.useCallback(() => {
    if (!popup) return;
    const cca3 = popup.cca3;
    if (tried.some(t => t.cca3 === cca3)) return;
    if (gameWon) return;
    handleGuessByCca3(cca3);
  }, [popup, tried, gameWon, handleGuessByCca3]);

  const renderPopupElement = React.useCallback((d) => {
    if (!d) return null;
    const isWin = !!d.isWin;
    const isTried = !!d.isTried;
    const title = isWin ? `🎉 ${d.name}!` : d.name;
    const subtitle = isWin
      ? 'Correct!'
      : isTried
        ? `${d.distanceKm.toLocaleString()} km ${getArrowEmoji(d.direction)}`
        : 'Selected — confirm your guess';
    const accentColor = isWin ? '#22c55e' : (d.color || '#3182ce');
    const textColor = isWin ? '#68d391' : (d.color || '#a0aec0');
    const canConfirm = !isWin && !isTried && !gameWon;
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
          {!isWin && !isTried && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePopupConfirm(); }}
              disabled={!canConfirm}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                border: 'none',
                background: canConfirm ? '#3182ce' : '#4a5568',
                color: 'white',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Guess {d.name}
            </button>
          )}
          {isTried && (
            <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: '#2d3748', color: '#a0aec0', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
              Already guessed ✗
            </div>
          )}
          {isWin && (
            <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#68d391', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
              Correct!
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
  }, [resetPopupPosition, gameWon, handlePopupConfirm]);

  const showPopupForCca3 = (cca3) => {
    const feat = features.find(f => f.properties.cca3 === cca3);
    if (!feat) return;
    const countryObj = countries.find(c => c.cca3 === cca3);
    const existing = tried.find(t => t.cca3 === cca3);
    if (existing) {
      setPopup({ cca3, name: existing.name, lat: existing.lat, lng: existing.lng, distanceKm: existing.distanceKm, direction: existing.direction, color: existing.color, isWin: false, isTried: true });
    } else {
      const [lat, lng] = countryObj?.latlng || feat.properties.latlng || [0, 0];
      const isWinCandidate = cca3 === targetCca3;
      if (isWinCandidate && gameWon) {
        setPopup({ cca3, name: feat.properties.name, lat, lng, isWin: true, isTried: false });
      } else {
        setPopup({ cca3, name: feat.properties.name, lat, lng, isWin: false, isTried: false });
      }
    }
    setGuessValue(feat.properties.name);
  };

  const handlePolygonClick = (polygon) => {
    if (disabled || gameWon) return;
    const cca3 = polygon.properties?.cca3;
    if (!cca3) return;
    showPopupForCca3(cca3);
  };

  const handleMissClick = ({ lat, lng }) => {
    if (disabled || gameWon) return;
    const altitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    const toleranceKm = Math.min(600, Math.max(20, altitude * 200));
    const nearest = findNearestCountry(countryIndex, lat, lng);
    if (nearest && nearest.distanceKm <= toleranceKm) {
      showPopupForCca3(nearest.cca3);
    }
  };

  const labelsData = useMemo(() => {
    if (!showLabels) return [];
    return worldPolygons
      .filter(f => f.properties?.name && f.properties?.latlng?.length === 2)
      .map(f => ({
        lat: f.properties.latlng[0],
        lng: f.properties.latlng[1],
        text: f.properties.name,
        cca3: f.properties.cca3,
      }));
  }, [worldPolygons, showLabels]);

  const polygonData = useMemo(() => {
    return worldPolygons
      .filter(p => p.geometry && (p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'))
      .map(polygon => {
        const cca3 = (polygon.properties?.cca3 || '').toLowerCase();
        const targetCca3 = (target?.properties?.cca3 || target?.cca3 || '').toLowerCase();
        const isTarget = gameWon && targetCca3 === cca3;
        const matched = tried.find(t => t.cca3.toLowerCase() === cca3);
        let color = 'rgba(0, 0, 0, 0)';
        if (isTarget) color = '#22c55e';
        else if (matched) color = matched.color;
        return {
          ...polygon,
          cca3,
          color,
          altitude: isTarget ? 0.03 : matched ? 0.02 : 0.01,
        };
      });
  }, [worldPolygons, tried, gameWon, target]);

  const openHint = () => {
    if (!target) return;
    const targetCca3 = target?.properties?.cca3 || target?.cca3;
    const correctCca3 = targetCca3;
    const targetName = target?.properties?.name || countries.find(c => c.cca3 === targetCca3)?.name?.common || targetCca3;
    const correct = { cca3: correctCca3, name: targetName };
    const pool = features.filter(f => f.properties.cca3 !== correctCca3);
    const shuffled = shuffleArray(pool);
    const distractors = shuffled.slice(0, 3).map(f => ({ cca3: f.properties.cca3, name: f.properties.name }));
    const opts = shuffleArray([...distractors, correct]);
    setHintOptions(opts);
    setHintTried(new Set());
    setShowHint(true);
  };

  const handleHintPick = (opt) => {
    const cca3 = opt.cca3;
    const lower = cca3.toLowerCase();
    if (disabled || hintTried.has(lower) || gameWon) return;
    const targetCca3 = target?.properties?.cca3 || target?.cca3;
    if (cca3 === targetCca3) {
      const nextCount = guessCount + 1;
      setGuessCount(nextCount);
      handleWin(nextCount);
    } else {
      handleGuessByCca3(cca3);
      setHintTried(prev => {
        const ns = new Set(prev);
        ns.add(lower);
        return ns;
      });
    }
  };

  if (!target) return <div style={{ color: '#a0aec0' }}>Loading...</div>;

  const targetCca3 = target?.properties?.cca3 || target?.cca3;
  const displayName = target?.properties?.name || countries.find(c => c.cca3 === targetCca3)?.name?.common || 'Unknown';

  return (
    <div>
      <div style={{ margin: '10px 0 8px', fontSize: '18px', color: '#a0aec0' }}>
        Guess the country from its silhouette
      </div>
      {targetCca3 && <CountryOutline countryCode={targetCca3} />}

      {gameWon ? (
        <div style={{ background: '#276749', padding: '14px 18px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '18px' }}>
            🎉 Correct! It was {displayName} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
          </div>
          <div style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
            {advancing ? 'Advancing to capital challenge in 2 seconds...' : 'Get ready for the capital!'}
          </div>
        </div>
      ) : (
        <p style={{ color: '#a0aec0', marginBottom: '10px', fontSize: '14px' }}>
          We show the silhouette — guess the country. Click the globe to fill the box. Wrong guesses show distance & direction with proximity colors.
        </p>
      )}

      <p style={{ color: '#a0aec0', marginBottom: '10px', fontSize: '14px' }}>
        Rotate and click the globe to put a country in the guess box. Toggle borders and persistent country names below — names stay on the globe so islands are easier to find. Scroll to zoom — small islands get bigger and easier to click.
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showBorders} onChange={e => setShowBorders(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          Show borders
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
          Show All Countries
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
          polygonStrokeColor={showBorders ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0)'}
          polygonHoverColor="rgba(37, 99, 235, 0.8)"
          polygonsTransitionDuration={500}
          polygonLabel={p => `<b>${p.properties?.name || ''}</b>`}
          onPolygonClick={handlePolygonClick}
          onGlobeClick={handleMissClick}
          htmlElementsData={labelsData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.015}
          htmlTransitionDuration={300}
          htmlElement={d => {
            const el = document.createElement('div');
            el.style.color = 'rgba(255,255,255,0.95)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '700';
            el.style.whiteSpace = 'nowrap';
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.style.userSelect = 'none';
            el.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';
            el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))';
            el.textContent = d.text;
            el.addEventListener('click', () => {
              if (disabled || gameWon) return;
              showPopupForCca3(d.cca3);
            });
            return el;
          }}
          enableAutoRotate={false}
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.15}
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

      <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={guessValue}
          onChange={e => setGuessValue(e.target.value)}
          placeholder="Type a country name or click globe..."
          list="country-list-silhouette"
          disabled={disabled || gameWon}
          style={{ padding: '10px', width: '250px', borderRadius: '5px', border: 'none', fontSize: '16px' }}
        />
        <datalist id="country-list-silhouette">
          {countries.map((c, idx) => (
            <option key={idx} value={c.name.common} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={disabled || gameWon || !countries.some(c => c.name.common.toLowerCase() === guessValue.trim().toLowerCase())}
          style={{
            padding: '10px 20px',
            marginLeft: '10px',
            borderRadius: '5px',
            border: 'none',
            background: !disabled && !gameWon && countries.some(c => c.name.common.toLowerCase() === guessValue.trim().toLowerCase()) ? '#48bb78' : '#4a5568',
            color: 'white',
            cursor: !disabled && !gameWon && countries.some(c => c.name.common.toLowerCase() === guessValue.trim().toLowerCase()) ? 'pointer' : 'not-allowed',
            fontSize: '16px',
          }}
        >
          Guess
        </button>
      </form>

      {!disabled && !gameWon && !showHint && (
        <button
          onClick={openHint}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #4a5568',
            background: '#2d3748',
            color: '#63b3ed',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
          }}
        >
          💡 Hint (4 choices)
        </button>
      )}
      {showHint && !gameWon && !disabled && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '6px' }}>Pick the country for this silhouette:</div>
          <HintChoices
            options={hintOptions}
            correct={targetCca3}
            triedSet={hintTried}
            onPick={handleHintPick}
            disabled={disabled || gameWon}
          />
          <button
            onClick={() => setShowHint(false)}
            style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#4a5568', color: 'white', cursor: 'pointer', fontSize: '13px' }}
          >
            Hide hint
          </button>
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 'bold' }}>
        {gameWon ? (
          <span style={{ color: '#48bb78' }}>🎉 Correct! It was {displayName} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!</span>
        ) : (
          <span style={{ color: '#a0aec0' }}>Guesses: {guessCount}</span>
        )}
      </div>

      {lastHint && !gameWon && (
        <div style={{ marginTop: '10px', color: '#f6ad55', fontSize: '16px' }}>{lastHint}</div>
      )}

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
                  focusCountry(t);
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
          </div>
        </div>
      )}
    </div>
  );
}

export default GuessCountryFromSilhouette;
