import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { simplify } from '@turf/simplify';
import { geoArea } from 'd3-geo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const countriesPath = path.join(root, 'public', 'countries.json');
const mapsDir = path.join(root, 'public', 'maps');
const outPath = path.join(root, 'public', 'countries-geo.json');

const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf-8'));
const allFeatures = [];
const validCca3 = [];

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

let missing = 0;
let loaded = 0;

for (const country of countries) {
  const cca3 = (country.cca3 || '').toLowerCase();
  if (!cca3 || cca3 === '-99') { missing++; continue; }

  const mapFile = path.join(mapsDir, `${cca3}.geo.json`);

  try {
    const raw = JSON.parse(fs.readFileSync(mapFile, 'utf-8'));
    const features = raw.features || [];
    let hasValidGeometry = false;
    for (const feat of features) {
      const geom = feat.geometry;
      const validType = geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon');
      if (!validType) {
        console.warn(`  SKIP ${cca3}: no valid geometry`);
        continue;
      }
      hasValidGeometry = true;
      const feature = {
        type: 'Feature',
        properties: {
          cca3: country.cca3,
          name: country.name?.common || '',
          latlng: country.latlng
        },
        geometry: geom
      };
      const simplified = simplify(feature, { tolerance: 0.1, highQuality: false });
      const geometry = cleanGeometry(simplified.geometry);
      if (!geometry) {
        console.warn(`  SKIP ${cca3}: geometry collapsed after simplify`);
        continue;
      }
      simplified.geometry = geometry;
      allFeatures.push(simplified);
    }
    if (hasValidGeometry) validCca3.push(country.cca3);
    loaded++;
  } catch (err) {
    console.warn(`  SKIP ${cca3}: ${err.message}`);
    missing++;
  }
}

const geojson = {
  type: 'FeatureCollection',
  features: allFeatures
};

fs.writeFileSync(outPath, JSON.stringify(geojson));
fs.writeFileSync(path.join(root, 'public', 'valid-countries.json'), JSON.stringify(validCca3));

let totalVertices = 0;
for (const f of geojson.features) {
  const g = f.geometry;
  if (!g) continue;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) totalVertices += ring.length;
}

console.log(`\nDone: ${loaded} countries loaded, ${missing} skipped.`);
console.log(`Total features: ${allFeatures.length}`);
console.log(`Total vertices: ${totalVertices} (avg ${Math.round(totalVertices/allFeatures.length)}/country)`);
console.log(`Valid cca3 for target: ${validCca3.length}`);
console.log(`Output: ${outPath}`);
