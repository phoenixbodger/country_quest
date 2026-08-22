import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDistance } from 'geolib';
import Globe from 'react-globe.gl';
import GameShell from '../components/GameShell';

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
    if (gameWon || tried.includes(cca3)) return;
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

    setTried(prev => [...prev, cca3]);
    setLastHint(`${clicked.properties.name} is ${distanceKm.toLocaleString()} km from the target.`);
  };

  const polygonData = useMemo(() => {
    return worldPolygons
      .filter(p => p.geometry && (p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'))
      .map(polygon => {
        const cca3 = (polygon.properties?.cca3 || '').toLowerCase();
        const isTarget = gameWon && target && target.properties.cca3.toLowerCase() === cca3;
        const isTried = tried.some(t => t.toLowerCase() === cca3);
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
        Rotate the globe and click the country you think is the target. Hover to see a country's name.
      </p>

      <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '560px' }}>
        <Globe
          ref={globeRef}
          width={globeSize}
          height={globeSize}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          globeImageUrl={`${import.meta.env.BASE_URL}earth-day.jpg`}
          polygonsData={polygonData}
          polygonCapColor="color"
          polygonAltitude="altitude"
          polygonSideColor="rgba(0, 0, 0, 0)"
          polygonStrokeColor="rgba(255, 255, 255, 0.55)"
          polygonHoverColor="rgba(37, 99, 235, 0.8)"
          polygonsTransitionDuration={300}
          polygonLabel={p => `<b>${p.properties?.name || ''}</b>`}
          onPolygonClick={p => handleGuess(p.properties?.cca3)}

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