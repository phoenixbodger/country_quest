import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import GameShell from '../components/GameShell';
import { buildCountryIndex, findNearestCountry } from '../nearestCountry';
import { useBorderedEarthTexture } from '../useBorderedEarthTexture';

function FindCountryGame({ onHome }) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [globeSize, setGlobeSize] = useState(400);
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [target, setTarget] = useState(null);
  const [tried, setTried] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [lastHint, setLastHint] = useState(null);
  const [showBorders, setShowBorders] = useState(false);
  const [showNames, setShowNames] = useState(false);
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

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries-geo.json`)
      .then(r => r.json())
      .then(data => {
        const feats = data.features.filter(f => f.properties?.cca3);
        setFeatures(feats);
        setWorldPolygons(data.features);
        setTarget(feats[Math.floor(Math.random() * feats.length)]);
      })
      .catch(err => console.error("Error loading countries:", err));
  }, []);

  const newGame = () => {
    setTarget(features[Math.floor(Math.random() * features.length)]);
    setTried([]);
    setClickCount(0);
    setGameWon(false);
    setLastHint(null);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
  };

  const handleGuess = (cca3) => {
    if (gameWon || tried.some(t => t.cca3 === cca3)) return;
    setClickCount(n => n + 1);

    if (cca3 === target.properties.cca3) {
      setGameWon(true);
      setLastHint(null);
      return;
    }

    const clicked = features.find(f => f.properties.cca3 === cca3);
    const [tLat, tLng] = target.properties.latlng;
    const [cLat, cLng] = clicked.properties.latlng;
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

  const focusCountry = ({ lat, lng }) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
    }
  };

  const countryIndex = useMemo(() => buildCountryIndex(features), [features]);

  // Fallback for clicks that miss a country's mesh (e.g. tiny islands):
  // snap to the nearest country within a zoom-adaptive tolerance.
  const handleMissClick = ({ lat, lng }) => {
    if (gameWon) return;
    const altitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    const toleranceKm = Math.min(600, Math.max(20, altitude * 200));
    const nearest = findNearestCountry(countryIndex, lat, lng);
    if (nearest && nearest.distanceKm <= toleranceKm) {
      handleGuess(nearest.cca3);
    }
  };

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

  const getArrowEmoji = (dir) => {
    const arrows = { N: "⬆️", NE: "↗️", E: "➡️", SE: "↘️", S: "⬇️", SW: "↙️", W: "⬅️", NW: "↖️" };
    return arrows[dir] || dir;
  };

  return (
    <GameShell title="🔍 Find Country Game" onHome={onHome}>
      {target && (
        <div style={{ margin: '20px 0' }}>
          <div style={{ fontSize: '18px', color: '#a0aec0', marginBottom: '6px' }}>Find this country:</div>
          <div style={{ fontSize: '34px', fontWeight: 'bold', color: '#63b3ed' }}>
            {target.properties.name}
          </div>
        </div>
      )}

      <p style={{ color: '#a0aec0', marginBottom: '10px' }}>
        Rotate the globe and click the country you think is the target.
        {showNames
          ? " Hover to see a country's name."
          : " Country names are hidden — tick “Show country names” to reveal them on hover."}
        Scroll to zoom in — small islands get bigger and easier to click.
      </p>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer', marginRight: '16px' }}>
        <input
          type="checkbox"
          checked={showBorders}
          onChange={e => setShowBorders(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        Show borders
      </label>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer', marginBottom: '10px' }}>
        <input
          type="checkbox"
          checked={showNames}
          onChange={e => setShowNames(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        Show country names
      </label>

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
          polygonStrokeColor={showBorders ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0)"}
          polygonHoverColor="rgba(37, 99, 235, 0.8)"
          polygonsTransitionDuration={300}
          polygonLabel={showNames ? (p => `<b>${p.properties?.name || ''}</b>`) : null}
          onPolygonClick={p => handleGuess(p.properties?.cca3)}
          onGlobeClick={handleMissClick}

          enableAutoRotate={false}

          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.15}
        />
      </div>

      <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}>
        {gameWon ? (
          <span style={{ color: '#48bb78' }}>
            🎉 Found it in {clickCount} {clickCount === 1 ? 'click' : 'clicks'}!
          </span>
        ) : (
          <span style={{ color: '#a0aec0' }}>
            Clicks: {clickCount}
          </span>
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
    </GameShell>
  );
}

export default FindCountryGame;