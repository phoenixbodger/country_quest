import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import GameShell from '../components/GameShell';
import { buildCountryIndex, findNearestCountry } from '../nearestCountry';
import { useBorderedEarthTexture } from '../useBorderedEarthTexture';
import CountryOutlineThumb from '../components/CountryOutlineThumb';
import { darkenGraticule, createOneDegreeGraticule } from '../utils/graticule';
import GlobeZoomControls from '../components/GlobeZoomControls';

function GlobeExplore({ onHome }) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [globeSize, setGlobeSize] = useState(700);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showBorders, setShowBorders] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showGraticule, setShowGraticule] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState(null);
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons, showBorders);

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
          altitude: isSelected ? 0.012 : 0.01,
          strokeColor: isSelected ? '#ff00ff' : 'rgba(0, 0, 0, 0)',
        };
      });
  }, [worldPolygons, selected]);

  const labelsData = useMemo(() => {
    if (!showLabels) return [];
    return worldPolygons
      .filter(f => f.properties?.name && f.properties?.latlng?.length === 2)
      .map(f => ({
        lat: f.properties.latlng[0],
        lng: f.properties.latlng[1],
        text: f.properties.name,
        cca3: f.properties.cca3,
        type: 'country-name',
        isSelected: selected && selected.cca3?.toLowerCase() === f.properties.cca3.toLowerCase(),
      }));
  }, [worldPolygons, showLabels, selected]);

  const graticuleLabelsData = useMemo(() => {
    if (!showGraticule) return [];
    const labels = [];
    // Latitude lines: show at longitude 0 (prime meridian) and 180
    for (let lat = -80; lat <= 80; lat += 10) {
      if (lat === 0) continue; // skip equator (already obvious)
      labels.push({ lat, lng: 0, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, type: 'graticule' });
      labels.push({ lat, lng: 180, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, type: 'graticule' });
    }
    // Longitude lines: show at multiple latitudes (like latitude at 0°/180°)
    const longitudeLatitudes = [60, 30, 0, -30, -60];
    for (const lat of longitudeLatitudes) {
      for (let lng = -170; lng <= 170; lng += 20) {
        if (lng === 0) continue; // skip prime meridian
        labels.push({ lat, lng, text: `${Math.abs(lng)}°${lng > 0 ? 'E' : 'W'}`, type: 'graticule' });
      }
    }
    // Add prime meridian and 180° labels
    labels.push({ lat: 0, lng: 0, text: '0°', type: 'graticule' });
    labels.push({ lat: 0, lng: 180, text: '180°', type: 'graticule' });
    return labels;
  }, [showGraticule]);

  const allLabelsData = useMemo(() => [...labelsData, ...graticuleLabelsData], [labelsData, graticuleLabelsData]);

  const selectedCountry = selected
    ? countries.find(c => c.cca3 === selected.cca3)
    : null;

  const selectedFeature = useMemo(() => {
    if (!selected?.cca3) return null;
    return worldPolygons.find(f => f.properties?.cca3 === selected.cca3) || null;
  }, [worldPolygons, selected]);

  const handlePolygonClick = (polygon) => {
    const cca3 = polygon.properties?.cca3;
    if (!cca3) return;
    setSelected({ cca3, name: polygon.properties?.name });
    setSearchError(null);
    setAutoRotate(false);
    const [lat, lng] = polygon.properties?.latlng || [0, 0];
    const currentAltitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    globeRef.current?.pointOfView({ lat, lng, altitude: currentAltitude }, 1000);
  };

  const resetView = () => {
    setSelected(null);
    setSearchInput("");
    setSearchError(null);
    setAutoRotate(true);
    globeRef.current?.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const raw = searchInput.trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    const match = countries.find(c =>
      c.name.common.toLowerCase() === lower ||
      c.altSpellings?.some(a => a.toLowerCase() === lower) ||
      c.name.official?.toLowerCase() === lower
    );
    if (!match) {
      setSearchError(`"${raw}" not found — check spelling or pick from suggestions.`);
      return;
    }
    setSearchError(null);
    setSelected({ cca3: match.cca3, name: match.name.common });
    setAutoRotate(false);
    // Prefer geo feature latlng (matches polygon centroid) then fallback to countries.json latlng
    const feature = worldPolygons.find(f => f.properties?.cca3 === match.cca3);
    const latlng = feature?.properties?.latlng || match.latlng;
    if (latlng && latlng.length === 2 && globeRef.current) {
      const [lat, lng] = latlng;
      const currentAltitude = globeRef.current.pointOfView()?.altitude ?? 2.5;
      globeRef.current.pointOfView({ lat, lng, altitude: currentAltitude }, 1000);
    }
  };

  const isValidSearch = countries.some(c =>
    c.name.common.toLowerCase() === searchInput.trim().toLowerCase() ||
    c.altSpellings?.some(a => a.toLowerCase() === searchInput.trim().toLowerCase()) ||
    c.name.official?.toLowerCase() === searchInput.trim().toLowerCase()
  );

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
        Rotate and zoom freely. Click a country — or its name/dot when labels are on — to focus on it.
        Scroll to zoom in — small islands get bigger and easier to click.
      </p>

      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', margin: '14px 0 8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchInput}
          onChange={e => { setSearchInput(e.target.value); if (searchError) setSearchError(null); }}
          placeholder="Type a country name..."
          list="globe-country-list"
          style={{ padding: '10px 12px', width: '260px', borderRadius: '6px', border: searchError ? '2px solid #fc8181' : 'none', fontSize: '16px', outline: 'none' }}
        />
        <datalist id="globe-country-list">
          {countries.map(c => (
            <option key={c.cca3} value={c.name.common} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={!isValidSearch}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: isValidSearch ? '#48bb78' : '#4a5568',
            color: 'white',
            cursor: isValidSearch ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Search
        </button>
      </form>
      {searchError && (
        <div style={{ color: '#feb2b2', fontSize: '14px', marginBottom: '8px' }}>{searchError}</div>
      )}

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showBorders}
            onChange={e => setShowBorders(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Show borders
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={e => setShowLabels(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Show all country names
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showGraticule}
            onChange={e => setShowGraticule(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Show graticule
        </label>
      </div>

      <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '700px', position: 'relative' }}>
        <Globe
          ref={globeRef}
          width={globeSize}
          height={Math.round(globeSize * 0.7)}
          globeImageUrl={showBorders && borderedGlobeUrl ? borderedGlobeUrl : `${import.meta.env.BASE_URL}earth-8k.jpg`}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

          polygonsData={polygonData}
          polygonCapColor="color"
          polygonAltitude="altitude"
          polygonSideColor="rgba(0, 0, 0, 0)"
          polygonStrokeColor={showBorders ? (d) => d.strokeColor || 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0)'}
          polygonsTransitionDuration={300}
          polygonLabel={null}
          onPolygonClick={handlePolygonClick}
          onGlobeClick={handleMissClick}

          htmlElementsData={allLabelsData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.015}
          htmlTransitionDuration={300}
          htmlElement={d => {
            const el = document.createElement('div');
            const isGraticule = d.type === 'graticule';

            if (isGraticule) {
              el.style.color = 'rgba(255,255,255,0.6)';
              el.style.fontSize = '10px';
              el.style.fontWeight = '500';
              el.style.whiteSpace = 'nowrap';
              el.style.pointerEvents = 'none';
              el.style.cursor = 'default';
              el.style.userSelect = 'none';
              el.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';
              el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))';
              el.textContent = d.text;
              return el;
            }

            // country-name: a clickable dot with the country name next to it.
            // Clicking the name (or the dot) focuses on that country and shows its info.
            el.style.display = 'inline-flex';
            el.style.alignItems = 'center';
            el.style.gap = '4px';
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.style.userSelect = 'none';

            const dot = document.createElement('div');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.flexShrink = '0';
            dot.style.backgroundColor = d.isSelected ? '#22c55e' : 'rgba(255, 255, 255, 0.95)';
            dot.style.border = '1.5px solid rgba(0, 0, 0, 0.85)';
            dot.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.85), 0 0 10px rgba(255, 255, 255, 0.35)';
            dot.style.transition = 'transform 0.1s';
            el.appendChild(dot);

            const name = document.createElement('div');
            name.textContent = d.text;
            name.style.color = 'rgba(255,255,255,0.95)';
            name.style.fontSize = '11px';
            name.style.fontWeight = '700';
            name.style.whiteSpace = 'nowrap';
            name.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';
            name.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))';
            name.style.transition = 'transform 0.1s';
            el.appendChild(name);

            el.addEventListener('mouseenter', () => {
              dot.style.transform = 'scale(1.5)';
              name.style.transform = 'scale(1.05)';
            });
            el.addEventListener('mouseleave', () => {
              dot.style.transform = 'scale(1)';
              name.style.transform = 'scale(1)';
            });

            el.addEventListener('click', (event) => {
              event.stopPropagation();
              const feature = worldPolygons.find(f => f.properties?.cca3 === d.cca3);
              if (feature) handlePolygonClick(feature);
            });

            return el;
          }}

          enableAutoRotate={autoRotate}
          autoRotateSpeed={0.6}

          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.15}

          showGraticules={showGraticule}
          customLayerData={showGraticule ? [{}] : []}
          customThreeObject={() => createOneDegreeGraticule()}
          onGlobeReady={() => darkenGraticule(globeRef)}
        />
        <GlobeZoomControls globeRef={globeRef} minAltitude={1.8} maxAltitude={3.0} step={10} position="bottom-right" />
      </div>

      {selectedCountry && (
        <div style={{
          display: 'inline-block',
          textAlign: 'left',
          background: '#2d3748',
          padding: '16px 20px',
          borderRadius: '12px',
          marginTop: '12px',
          minWidth: '280px',
          maxWidth: '520px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          border: '1px solid #4a5568',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '36px', lineHeight: 1 }}>{selectedCountry.flag}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{selectedCountry.name.common}</div>
              <div style={{ fontSize: '13px', color: '#a0aec0' }}>{selectedCountry.name.official}</div>
            </div>
            {selectedFeature && <CountryOutlineThumb feature={selectedFeature} size={60} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '14px', textAlign: 'left' }}>
            <div><span style={{ color: '#a0aec0' }}>Capital:</span> <span style={{ color: 'white', fontWeight: 600 }}>{selectedCountry.capital?.join(', ') || '—'}</span></div>
            <div><span style={{ color: '#a0aec0' }}>Region:</span> <span style={{ color: 'white' }}>{selectedCountry.region || '—'}{selectedCountry.subregion ? ` · ${selectedCountry.subregion}` : ''}</span></div>
            <div><span style={{ color: '#a0aec0' }}>Area:</span> <span style={{ color: 'white' }}>{selectedCountry.area ? `${selectedCountry.area.toLocaleString()} km²` : '—'}</span></div>
            <div><span style={{ color: '#a0aec0' }}>Landlocked:</span> <span style={{ color: 'white' }}>{selectedCountry.landlocked ? 'Yes' : 'No'}</span></div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#a0aec0' }}>Languages:</span> <span style={{ color: 'white' }}>{selectedCountry.languages ? Object.values(selectedCountry.languages).join(', ') : '—'}</span></div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#a0aec0' }}>Borders:</span> <span style={{ color: 'white' }}>{selectedCountry.borders?.length ? `${selectedCountry.borders.length} — ${selectedCountry.borders.join(', ')}` : 'None (island)'}</span></div>
            <div style={{ gridColumn: '1 / -1', color: '#718096', fontSize: '12px', marginTop: '2px' }}>{selectedCountry.cca3} · {selectedCountry.cca2} · {selectedCountry.latlng ? `${selectedCountry.latlng[0].toFixed(1)}°, ${selectedCountry.latlng[1].toFixed(1)}°` : ''}</div>
          </div>
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