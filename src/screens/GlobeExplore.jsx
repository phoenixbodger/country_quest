import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import GameShell from '../components/GameShell';
import { buildCountryIndex, findNearestCountry } from '../nearestCountry';
import { useBorderedEarthTexture } from '../useBorderedEarthTexture';

function GlobeExplore({ onHome }) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [globeSize, setGlobeSize] = useState(700);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showBorders, setShowBorders] = useState(false);
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setGlobeSize(Math.min(el.clientWidth, 700));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries-geo.json`)
      .then(res => res.json())
      .then(data => setWorldPolygons(data.features))
      .catch(err => console.error("Error loading countries data:", err));

    fetch(`${import.meta.env.BASE_URL}countries.json`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error("Error loading countries:", err));
  }, []);

  const polygonData = useMemo(() => {
    return worldPolygons
      .filter(p => p.geometry && (p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'))
      .map(polygon => {
        const cca3 = (polygon.properties?.cca3 || '').toLowerCase();
        const isSelected = selected && selected.cca3.toLowerCase() === cca3;
        return {
          ...polygon,
          cca3,
          color: isSelected ? '#22c55e' : 'rgba(0, 0, 0, 0)',
          altitude: isSelected ? 0.02 : 0.01,
        };
      });
  }, [worldPolygons, selected]);

  const selectedCountry = selected
    ? countries.find(c => c.cca3 === selected.cca3)
    : null;

  const handlePolygonClick = (polygon) => {
    const cca3 = polygon.properties?.cca3;
    if (!cca3) return;
    setSelected({ cca3, name: polygon.properties?.name });
    setAutoRotate(false);
    const [lat, lng] = polygon.properties?.latlng || [0, 0];
    globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
  };

  const resetView = () => {
    setSelected(null);
    setAutoRotate(true);
    globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
  };

  const countryIndex = useMemo(() => buildCountryIndex(worldPolygons), [worldPolygons]);

  // Fallback for clicks that miss a country's mesh (e.g. tiny islands):
  // snap to the nearest country within a zoom-adaptive tolerance.
  const handleMissClick = ({ lat, lng }) => {
    const altitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    const toleranceKm = Math.min(600, Math.max(20, altitude * 200));
    const nearest = findNearestCountry(countryIndex, lat, lng);
    if (nearest && nearest.distanceKm <= toleranceKm) {
      const feature = worldPolygons.find(f => f.properties?.cca3 === nearest.cca3);
      if (feature) handlePolygonClick(feature);
    }
  };

  return (
    <GameShell title="🌐 Globe" onHome={onHome}>
      <p style={{ color: '#a0aec0', marginBottom: '10px' }}>
        Rotate and zoom freely. Hover a country to see its name, click to focus on it.
        Scroll to zoom in — small islands get bigger and easier to click.
      </p>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer', marginBottom: '10px' }}>
        <input
          type="checkbox"
          checked={showBorders}
          onChange={e => setShowBorders(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        Show borders
      </label>

      <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '700px' }}>
        <Globe
          ref={globeRef}
          width={globeSize}
          height={Math.round(globeSize * 0.7)}
          globeImageUrl={showBorders && borderedGlobeUrl ? borderedGlobeUrl : `${import.meta.env.BASE_URL}earth-day.jpg`}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

          polygonsData={polygonData}
          polygonCapColor="color"
          polygonAltitude="altitude"
          polygonSideColor="rgba(0, 0, 0, 0)"
          polygonStrokeColor={showBorders ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0)"}
          polygonsTransitionDuration={300}
          polygonLabel={p => `<b>${p.properties?.name || ''}</b>`}
          onPolygonClick={handlePolygonClick}
          onGlobeClick={handleMissClick}

          enableAutoRotate={autoRotate}
          autoRotateSpeed={0.6}

          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.15}
        />
      </div>

      {selectedCountry && (
        <div style={{
          display: 'inline-block',
          background: '#2d3748',
          padding: '12px 24px',
          borderRadius: '10px',
          marginTop: '10px',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          {selectedCountry.flag} {selectedCountry.name.common}
          {selectedCountry.capital?.[0] && (
            <span style={{ color: '#a0aec0', fontWeight: 'normal' }}>
              {' '}— Capital: {selectedCountry.capital[0]}
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: '15px' }}>
        <button
          onClick={resetView}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#2d3748',
            color: 'white',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
        >
          Reset view
        </button>
      </div>
    </GameShell>
  );
}

export default GlobeExplore;