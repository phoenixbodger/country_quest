import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import CountryOutline from '../../CountryOutline';
import HintChoices from '../../components/HintChoices';
import { useBorderedEarthTexture } from '../../useBorderedEarthTexture';
import { buildCountryIndex, findNearestCountry } from '../../nearestCountry';
import { shuffleArray } from '../../utils/capitalHelpers';
import { getProximityColor } from '../../distanceColors';

function GuessCountryFromSilhouette({ countries, features, worldPolygons, target, onWon }) {
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
    if (onWon) {
      // parent will auto-advance after 2s
      onWon(nextCount);
    }
  };

  const handleGuessByCca3 = (cca3) => {
    if (gameWon || tried.some(t => t.cca3 === cca3)) return;
    const nextCount = guessCount + 1;
    setGuessCount(nextCount);
    // target is a geo feature with properties.cca3, but parent may pass country obj with cca3
    const targetCca3 = target?.properties?.cca3 || target?.cca3;
    if (cca3 === targetCca3) {
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
  };

  const handleSubmitCountry = (country) => {
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
    if (hintTried.has(lower) || gameWon) return;
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

      <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={guessValue}
          onChange={e => setGuessValue(e.target.value)}
          placeholder="Type a country name or click globe..."
          list="country-list-silhouette"
          disabled={gameWon}
          style={{ padding: '10px', width: '250px', borderRadius: '5px', border: 'none', fontSize: '16px' }}
        />
        <datalist id="country-list-silhouette">
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
          <div style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '6px' }}>Pick the country for this silhouette:</div>
          <HintChoices
            options={hintOptions}
            correct={targetCca3}
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
                onClick={() => focusCountry(t)}
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
