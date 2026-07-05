import React, { useEffect, useState } from 'react';
import * as d3Geo from 'd3-geo';

function CountryOutline({ countryCode }) {
  const [geoJson, setGeoJson] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!countryCode) return;

    setError(false);
    // Fetch the specific country's geojson file from public/maps/
    // Force the country code to lowercase to match your filenames!
    fetch(`/maps/${countryCode.toLowerCase()}.geo.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Map file not found");
        return res.json();
      })
      .then((data) => setGeoJson(data))
      .catch((err) => {
        console.error("Could not load country map shape:", err);
        setError(true);
      });
  }, [countryCode]);

  if (error) return <div style={{ color: '#fc8181', margin: '20px' }}>⚠️ Map outline unavailable</div>;
  if (!geoJson) return <div style={{ margin: '20px' }}>Loading country shape...</div>;

  // D3 Projection Math: Automatically fits any size country perfectly into a 250x250 pixel box
  const width = 250;
  const height = 250;
  const projection = d3Geo.geoMercator().fitSize([width, height], geoJson);
  const pathGenerator = d3Geo.geoPath().projection(projection);
  
  // Convert the GeoJSON coordinates into an SVG path string
  const pathData = pathGenerator(geoJson);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
      <div style={{ 
        background: '#2d3748', 
        padding: '15px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)' 
      }}>
        <svg width={width} height={height}>
          <path 
            d={pathData} 
            fill="#4a5568"      // Dark grey silhouette fill
            stroke="#ffffff"    // Clean white border
            strokeWidth="2" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default CountryOutline;
