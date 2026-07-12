import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';

function GameGlobe({ latestGuessObj, guesses = [] }) {
  const globeRef = useRef();
  const [worldPolygons, setWorldPolygons] = useState([]);

  // Load lightweight Natural Earth GeoJSON data
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(geoJsonData => {
        setWorldPolygons(geoJsonData.features);
      })
      .catch(err => console.error("Error loading world map data:", err));
  }, []);

  // Spin camera to focus on the latest guess coordinates
  useEffect(() => {
    if (!latestGuessObj || !latestGuessObj.latlng || !globeRef.current) return;

    const [lat, lng] = latestGuessObj.latlng;
    globeRef.current.pointOfView({
      lat,
      lng,
      altitude: 1.8
    }, 1300);
  }, [latestGuessObj]);

  // Color matching computation loop
  const polygonData = useMemo(() => {
    const guessedCodes = new Set(
      guesses
        .filter(g => g.cca3)
        .map(g => g.cca3.toLowerCase())
    );

    return worldPolygons.map(polygon => {
      const properties = polygon.properties || {};
      const cca3 = (
        properties.ISO_A3 || 
        properties.iso_a3 || 
        properties.ADM0_A3 || 
        properties.SOV_A3 || 
        polygon.id
      )?.toLowerCase();

      const isGuessed = cca3 && guessedCodes.has(cca3);
      
      // Look through the history array to see if this specific country was guessed with distance 0 (Win!)
      const matchedGuess = guesses.find(g => g.cca3?.toLowerCase() === cca3);
      const isCorrect = matchedGuess && matchedGuess.distance === 0;
      
      const isLatest = latestGuessObj?.cca3 && cca3 === latestGuessObj.cca3.toLowerCase();

      // --- COLOR MATRIX ---
      let finalColor = '#e2e8f0'; // Default: Slate light-grey land
      if (isCorrect) {
        finalColor = '#22c55e';   // Winning Country: Vivid Green
      } else if (isGuessed) {
        finalColor = '#f59e0b';   // Regular Guess: Neon Yellow
      }

      return {
        ...polygon,
        color: finalColor,
        altitude: isCorrect ? 0.06 : (isLatest ? 0.05 : (isGuessed ? 0.02 : 0.002)),
      };
    });
  }, [worldPolygons, guesses, latestGuessObj]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      margin: '25px auto',
      background: '#0f172a',
      borderRadius: '50%',
      overflow: 'hidden',
      width: '400px',
      height: '400px',
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.6)'
    }}>
      <Globe
        ref={globeRef}
        width={400}
        height={400}
        
        backgroundColor="rgba(0,0,0,0)"
        showGlobeVolume={true}
        showAtmosphere={true}
        
        // --- THE PERMANENT BLUE SEA FIX ---
        // We use a clean, reliable, official water texture asset from the library examples
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
        
        // --- Polygon Layers Configuration ---
        polygonsData={polygonData}
        polygonAltitude="altitude"
        polygonCapColor={d => d.color}
        polygonSideColor="#b45309"
        polygonStrokeColor="#94a3b8" // Crisp grey borders between countries
        polygonsTransitionDuration={250}

        atmosphereColor="#60a5fa"
        atmosphereAltitude={0.12}
      />
    </div>
  );
}

export default GameGlobe;