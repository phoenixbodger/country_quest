import React, { useMemo, useState } from 'react';
import * as d3Geo from 'd3-geo';

function WorldMap({ features, targetCca3, triedCca3 = [], onCountryClick }) {
  const [hovered, setHovered] = useState(null);

  const { projection, pathGenerator } = useMemo(() => {
    const width = 900;
    const height = 450;
    const projection = d3Geo.geoNaturalEarth1().fitSize([width, height], {
      type: 'FeatureCollection',
      features,
    });
    return { projection, pathGenerator: d3Geo.geoPath().projection(projection) };
  }, [features]);

  const getFill = (cca3) => {
    if (cca3 === targetCca3) return '#22c55e';
    if (triedCca3.includes(cca3)) return '#ef4444';
    if (hovered === cca3) return '#63b3ed';
    return '#4a5568';
  };

  return (
    <svg
      viewBox="0 0 900 450"
      style={{ width: '100%', maxWidth: '900px', background: '#0f172a', borderRadius: '12px' }}
    >
      {features.map(f => {
        const cca3 = f.properties?.cca3;
        if (!cca3) return null;
        return (
          <path
            key={cca3}
            d={pathGenerator(f)}
            fill={getFill(cca3)}
            stroke="#1a202c"
            strokeWidth="0.5"
            style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
            onClick={() => onCountryClick(cca3)}
            onMouseEnter={() => setHovered(cca3)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}
    </svg>
  );
}

export default WorldMap;