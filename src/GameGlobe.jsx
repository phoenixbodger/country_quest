import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';

function GameGlobe({ latestGuessObj }) {
  const globeRef = useRef();
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [selectedCountryCca3, setSelectedCountryCca3] = useState(null);

  // 1. Fetch the simplified entire world map data (Admin 0)
  // This version loads much faster than the full 1.3MB data for globe display.
  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json') // Simplified world map
      .then(res => res.json())
      .then(topoData => {
        // We'll extract and format the country polygons from TopoJSON
        const countries = topoData.objects.countries.geometries.map(geo => {
          return {
            ...geo,
            type: 'Feature',
            // Map the internal 'id' (ISO numeric) to 'cca3' (like 'FRA', 'CAN') for our game logic
            cca3: geo.id_cca3 || geo.properties?.ISO_A3 // This mapping depends on the atlas source
          };
        });
        setWorldPolygons(countries);
      });
  }, []);

  // 2. State & Animation Management
  useEffect(() => {
    if (!latestGuessObj || !globeRef.current) return;

    // A. Center and zoom to the guessed country
    if (latestGuessObj.latlng) {
      const [lat, lng] = latestGuessObj.latlng;
      globeRef.current.pointOfView({
        lat,
        lng,
        altitude: 2.0 // Zoom level
      }, 1500); // 1.5s animation duration
    }

    // B. Trigger the coloring logic using the 3-letter code (cca3)
    // We assume the game logic provided latestGuessObj.cca3
    if (latestGuessObj.cca3) {
      setSelectedCountryCca3(latestGuessObj.cca3.toUpperCase());
    }

  }, [latestGuessObj]);


  // 3. Optimized Coloring Logic using useMemo
  // This dynamically calculates the color array only when selectedCountryCca3 changes.
  const polygonData = useMemo(() => {
    return worldPolygons.map(polygon => {
      // Find the specific unique identifier from the TopoJSON features
      const currentCca3 = polygon.properties?.ISO_A3_EH || polygon.properties?.ISO_A3 || polygon.properties?.WB_A3 || polygon.id;

      // Match against our selected guess code
      const isSelected = selectedCountryCca3 && currentCca3 === selectedCountryCca3;

      return {
        ...polygon,
        color: isSelected ? 'rgba(72, 187, 120, 0.9)' : 'rgba(74, 85, 104, 0.4)', // Green if selected, Slate Grey otherwise
        altitude: isSelected ? 0.05 : 0.005, // Slightly elevate the selected country
      };
    });
  }, [worldPolygons, selectedCountryCca3]);


  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      margin: '20px auto',
      background: '#0f172a',
      borderRadius: '50%',
      overflow: 'hidden',
      width: '400px',
      height: '400px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.7)'
    }}>
      <Globe
        ref={globeRef}
        width={400}
        height={400}
        
        // --- Setup the Polygon (Map Drawing) Features ---
        polygonsData={polygonData}
        polygonAltitude="altitude"
        polygonCapColor="color"
        polygonSideColor="rgba(0, 0, 0, 0)" // Hide the 'sides' of the polygons
        polygonStrokeColor="#ffffff"       // White borders
        polygonsTransitionDuration={500}  // 0.5s smooth coloring transition

        // --- Keep the core globe aesthetics ---
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.15}
      />
    </div>
  );
}

export default GameGlobe;