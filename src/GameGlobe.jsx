import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { geoArea } from 'd3-geo';

function distinctPointCount(ring) {
  const seen = new Set();
  for (const [lng, lat] of ring) seen.add(`${lng},${lat}`);
  return seen.size;
}

function isInsideOut(ring) {
  return geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI;
}

function cleanRing(ring) {
  if (distinctPointCount(ring) < 3) return null;
  return isInsideOut(ring) ? ring.slice().reverse() : ring;
}

function cleanPolygon(polygon) {
  const rings = polygon.map(cleanRing).filter(Boolean);
  return rings.length ? rings : null;
}

function cleanGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    const rings = cleanPolygon(geometry.coordinates);
    return rings ? { ...geometry, coordinates: rings } : null;
  }
  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates.map(cleanPolygon).filter(Boolean);
    return polygons.length ? { ...geometry, coordinates: polygons } : null;
  }
  return geometry;
}

function GameGlobe({ latestGuessObj, guesses = [], targetCountry }) {
  const globeRef = useRef();
  const [worldPolygons, setWorldPolygons] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries-geo.json`)
      .then(res => res.json())
      .then(data => setWorldPolygons(data.features))
      .catch(err => console.error("Error loading countries data:", err));
  }, []);

  useEffect(() => {
    if (!latestGuessObj || !latestGuessObj.latlng || !globeRef.current) return;
    const [lat, lng] = latestGuessObj.latlng;
    globeRef.current.pointOfView({ lat, lng, altitude: 1.8 }, 1300);
  }, [latestGuessObj]);

  const polygonData = useMemo(() => {
    return worldPolygons
      .filter(p => p.geometry && (p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'))
      .map(polygon => {
        const geometry = cleanGeometry(polygon.geometry);
        if (!geometry) return null;
        const cca3 = (polygon.properties?.cca3 || '').toLowerCase();
        const matchedGuess = guesses.find(g => (g.cca3 || '').toLowerCase() === cca3);
        const isCorrect = matchedGuess && matchedGuess.distance === 0;
        let color = 'rgba(0,0,0,0)';
        if (isCorrect) color = '#22c55e';
        else if (matchedGuess) color = matchedGuess.color;
        return {
          ...polygon,
          geometry,
          cca3,
          color,
          altitude: 0.01,
        };
      })
      .filter(Boolean);
  }, [worldPolygons, guesses, targetCountry]);

  return (
    <div style={{
      margin: '25px auto',
      background: '#0f172a',
      borderRadius: '50%',
      overflow: 'hidden',
      width: '400px',
      height: '400px',
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.6)',
    }}>
      <Globe
        ref={globeRef}
        width={400}
        height={400}
        globeImageUrl={`${import.meta.env.BASE_URL}earth-day.jpg`}
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        polygonsData={polygonData}
        polygonCapColor="color"
        polygonAltitude="altitude"
        polygonSideColor="rgba(0, 0, 0, 0)"
        polygonsTransitionDuration={500}

        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.15}
      />
    </div>
  );
}

export default GameGlobe;
