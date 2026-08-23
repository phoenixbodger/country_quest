import React, { useMemo } from 'react';
import * as d3Geo from 'd3-geo';

function CountryOutlineThumb({ feature, size = 60 }) {
  const pathData = useMemo(() => {
    if (!feature?.geometry) return null;
    const inner = size - 8;
    const projection = d3Geo.geoMercator().fitSize([inner, inner], feature);
    const path = d3Geo.geoPath().projection(projection);
    return path(feature);
  }, [feature, size]);

  if (!pathData) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width={size} height={size} rx={8} fill="#1a202c" />
      <g transform="translate(4, 4)">
        <path
          d={pathData}
          fill="#4a5568"
          stroke="white"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default CountryOutlineThumb;
