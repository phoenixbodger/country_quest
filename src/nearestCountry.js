import { getDistance } from 'geolib';

// Collect every [lng, lat] vertex from a Polygon / MultiPolygon geometry.
function collectVertices(geometry) {
  const out = [];
  if (!geometry) return out;
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      for (const [lng, lat] of ring) out.push([lng, lat]);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) out.push([lng, lat]);
      }
    }
  }
  return out;
}

// Build a lookup: cca3 -> { name, vertices: [[lng, lat], ...] }
export function buildCountryIndex(features) {
  const index = new Map();
  for (const f of features) {
    const cca3 = f.properties?.cca3;
    if (!cca3) continue;
    const vertices = collectVertices(f.geometry);
    if (!vertices.length) continue;
    index.set(cca3, { name: f.properties?.name, vertices });
  }
  return index;
}

// Find the country whose geometry is closest to the given point.
// Returns { cca3, name, distanceKm } or null if no countries indexed.
export function findNearestCountry(index, lat, lng) {
  let best = null;
  for (const [cca3, { name, vertices }] of index) {
    for (const [vLng, vLat] of vertices) {
      const d = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: vLat, longitude: vLng }
      ) / 1000;
      if (!best || d < best.distanceKm) {
        best = { cca3, name, distanceKm: d };
        if (d === 0) return best;
      }
    }
  }
  return best;
}
