import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import CountryGuessForm from '../../components/CountryGuessForm';
import HintChoices from '../../components/HintChoices';
import { useBorderedEarthTexture } from '../../useBorderedEarthTexture';
import { buildCountryIndex, findNearestCountry } from '../../nearestCountry';
import { shuffleArray } from '../../utils/capitalHelpers';

function NameTheCountry({ countries, features, worldPolygons, target, setTarget }) {
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
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons);

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

  const newGame = () => {
    if (features.length) {
      const next = features[Math.floor(Math.random() * features.length)];
      setTarget(next);
    }
    setTried([]);
    setGuessCount(0);
    setGameWon(false);
    setLastHint(null);
    setShowHint(false);
    setHintOptions([]);
    setHintTried(new Set());
    setGuessValue('');
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
  };

  const getArrowEmoji = (dir) => {
    const arrows = { N: '⬆️', NE: '↗️', E: '➡️', SE: '↘️', S: '⬇️', SW: '↙️', W: '⬅️', NW: '↖️' };
    return arrows[dir] || dir;
  };

  const handleGuessByCca3 = (cca3) => {
    if (gameWon || tried.some(t => t.cca3 === cca3)) return;
    setGuessCount(n => n + 1);
    if (cca3 === target.properties.cca3) {
      setGameWon(true);
      setLastHint(null);
      setShowHint(false);
      return;
    }
    const clicked = features.find(f => f.properties.cca3 === cca3);
    // Use latlng from countries.json if available, fallback to feature latlng
    const targetCountry = countries.find(c => c.cca3 === target.properties.cca3);
    const clickedCountry = countries.find(c => c.cca3 === cca3);
    const [tLat, tLng] = targetCountry?.latlng || target.properties.latlng;
    const [cLat, cLng] = clickedCountry?.latlng || clicked.properties.latlng;
    const distanceKm = Math.round(getDistance(
      { latitude: cLat, longitude: cLng },
      { latitude: tLat, longitude: tLng }
    ) / 1000);
    const direction = getCompassDirection(
      { latitude: cLat, longitude: cLng },
      { latitude: tLat, longitude: tLng }
    );
    setTried(prev => [...prev, { cca3, name: clicked.properties.name, distanceKm, direction, lat: cLat, lng: cLng }]);
    setLastHint(`${clicked.properties.name} is ${distanceKm.toLocaleString()} km from the target ${getArrowEmoji(direction)}.`);
  };

  const handleSubmitCountry = (country) => {
    // country is from countries.json
    if (gameWon) return;
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

  const handlePolygonClick = (polygon) => {
    const cca3 = polygon.properties?.cca3;
    if (!cca3) return;
    const feat = features.find(f => f.properties.cca3 === cca3);
    if (!feat) return;
    // Put country name in guess box, do not auto-submit
    setGuessValue(feat.properties.name);
  };

  const handleMissClick = ({ lat, lng }) => {
    if (gameWon) return;
    const altitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    const toleranceKm = Math.min(600, Math.max(20, altitude * 200));
    const nearest = findNearestCountry(countryIndex, lat, lng);
    if (nearest && nearest.distanceKm <= toleranceKm) {
      const feat = features.find(f => f.properties.cca3 === nearest.cca3);
      if (feat) setGuessValue(feat.properties.name);
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
        const isTarget = gameWon && target && target.properties.cca3.toLowerCase() === cca3;
        const isTried = tried.some(t => t.cca3.toLowerCase() === cca3);
        let color = 'rgba(0, 0, 0, 0)';
        if (isTarget) color = '#16a34a';
        else if (isTried) color = 'rgba(225, 29, 72, 0.55)';
        return {
          ...polygon,
          cca3,
          color,
          altitude: isTarget ? 0.03 : isTried ? 0.02 : 0.01,
        };
      });
  }, [worldPolygons, tried, gameWon, target]);

  const openHint = () => {
    if (!target) return;
    // Build 4 options: 1 correct + 3 random from features (with capital)
    const correctCca3 = target.properties.cca3;
    const correct = { cca3: correctCca3, name: target.properties.name };
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
    if (hintTried.has(cca3) || gameWon) return;
    if (cca3 === target.properties.cca3) {
      setGuessCount(n => n + 1);
      setGameWon(true);
      setShowHint(false);
      setLastHint(null);
    } else {
      handleGuessByCca3(cca3);
      setHintTried(prev => {
        const ns = new Set(prev);
        ns.add(cca3);
        return ns;
      });
    }
  };

  if (!target) return <div style={{ color: '#a0aec0' }}>Loading...</div>;

  const targetCountryObj = countries.find(c => c.cca3 === target.properties.cca3);
  const capitalDisplay = targetCountryObj?.capital ? targetCountryObj.capital.join(', ') : target.properties.capital || '—';

  return (
    <div>
      <div style={{ margin: '20px 0' }}>
        <div style={{ fontSize: '18px', color: '#a0aec0', marginBottom: '6px' }}>What country has this capital?</div>
        <div style={{
          display: 'inline-block',
          background: '#2d3748',
          padding: '16px 28px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#63b3ed' }}>{capitalDisplay}</div>
        </div>
        <div style={{ marginTop: '10px', color: '#a0aec0', fontSize: '14px' }}>
          Target: capital shown above — guess the country. Click the globe to fill the box, then press Guess.
        </div>
      </div>

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

      <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '560px' }}>
        <Globe
          ref={globeRef}
          width={globeSize}
          height={globeSize}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          globeImageUrl={showBorders && borderedGlobeUrl ? borderedGlobeUrl : `${import.meta.env.BASE_URL}earth-day.jpg`}
          polygonsData={polygonData}
          polygonCapColor="color"
          polygonAltitude="altitude"
          polygonSideColor="rgba(0, 0, 0, 0)"
          polygonStrokeColor={showBorders ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0)'}
          polygonHoverColor="rgba(37, 99, 235, 0.8)"
          polygonsTransitionDuration={300}
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
              const feat = features.find(f => f.properties?.cca3 === d.cca3);
              if (feat) setGuessValue(feat.properties.name);
            });
            return el;
          }}
          enableAutoRotate={false}
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.15}
        />
      </div>

      {/* Guess form: controlled value with globe fill */}
      <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={guessValue}
          onChange={e => setGuessValue(e.target.value)}
          placeholder="Type a country name or click globe..."
          list="country-list-namecountry"
          disabled={gameWon}
          style={{ padding: '10px', width: '250px', borderRadius: '5px', border: 'none', fontSize: '16px' }}
        />
        <datalist id="country-list-namecountry">
          {countries.map((c, idx) => (
            <option key={idx} value={c.name.common} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={gameWon || !countries.some(c => c.name.common.toLowerCase() === guessValue.trim().toLowerCase())}
          style={{
            padding: '10px 20px',
            marginLeft: '10px',
            borderRadius: '5px',
            border: 'none',
            background: !gameWon && countries.some(c => c.name.common.toLowerCase() === guessValue.trim().toLowerCase()) ? '#48bb78' : '#4a5568',
            color: 'white',
            cursor: !gameWon && countries.some(c => c.name.common.toLowerCase() === guessValue.trim().toLowerCase()) ? 'pointer' : 'not-allowed',
            fontSize: '16px',
          }}
        >
          Guess
        </button>
      </form>

      {/* Hint */}
      {!gameWon && !showHint && (
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
      {showHint && !gameWon && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '6px' }}>Pick the country for capital {capitalDisplay}:</div>
          <HintChoices
            options={hintOptions}
            correct={target.properties.cca3}
            triedSet={hintTried}
            onPick={handleHintPick}
            disabled={gameWon}
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
          <span style={{ color: '#48bb78' }}>🎉 Correct! It was {target.properties.name} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!</span>
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
                onClick={() => focusCountry(t)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  maxWidth: '360px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                }}
              >
                <span>{t.name}</span>
                <span style={{ color: '#f6ad55', fontWeight: 'bold' }}>{t.distanceKm.toLocaleString()} km {getArrowEmoji(t.direction)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {gameWon && (
        <button
          onClick={newGame}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#48bb78',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Play again
        </button>
      )}
    </div>
  );
}

export default NameTheCountry;
