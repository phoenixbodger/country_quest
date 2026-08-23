import React, { useState, useEffect, useMemo } from 'react';
import GameShell from '../components/GameShell';
import NameTheCapital from './CapitalQuestModes/NameTheCapital';
import NameTheCountry from './CapitalQuestModes/NameTheCountry';
import { buildCapitalIndex } from '../utils/capitalHelpers';

function CapitalQuest({ onHome }) {
  const [mode, setMode] = useState('capital'); // 'capital' = Name the Capital, 'country' = Name the Country
  const [countries, setCountries] = useState([]);
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [targetCapital, setTargetCapital] = useState(null); // country obj for NameTheCapital
  const [targetCountryFeature, setTargetCountryFeature] = useState(null); // feature for NameTheCountry

  const capitalIndex = useMemo(() => {
    if (!countries.length) return { uniqueCapitals: [], capitalToCountries: new Map(), capitalLowerSet: new Set() };
    return buildCapitalIndex(countries);
  }, [countries]);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}countries.json`).then(r => r.json()),
      fetch(`${import.meta.env.BASE_URL}countries-geo.json`).then(r => r.json()),
    ]).then(([allCountries, geo]) => {
      const sorted = allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
      setCountries(sorted);
      const feats = geo.features.filter(f => f.properties?.cca3);
      setFeatures(feats);
      setWorldPolygons(geo.features);
      const withCapital = sorted.filter(c => c.capital && c.capital.length > 0);
      setTargetCapital(withCapital[Math.floor(Math.random() * withCapital.length)]);
      const cca3Set = new Set(withCapital.map(c => c.cca3));
      const geoWithCapital = feats.filter(f => cca3Set.has(f.properties.cca3));
      setTargetCountryFeature(geoWithCapital[Math.floor(Math.random() * geoWithCapital.length)]);
    }).catch(err => console.error("Error loading countries:", err));
  }, []);

  const handleNewCapitalTarget = () => {
    const withCapital = countries.filter(c => c.capital && c.capital.length > 0);
    setTargetCapital(withCapital[Math.floor(Math.random() * withCapital.length)]);
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    background: active ? '#3182ce' : '#2d3748',
    color: 'white',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
  });

  return (
    <GameShell title="🏛️ Capital Quest" onHome={onHome}>
      <div style={{ display: 'flex', gap: '10px', maxWidth: '520px', margin: '10px auto 18px' }}>
        <button onClick={() => setMode('capital')} style={tabStyle(mode === 'capital')}>
          🏙️ Name the Capital
        </button>
        <button onClick={() => setMode('country')} style={tabStyle(mode === 'country')}>
          🌍 Name the Country
        </button>
      </div>
      <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '10px' }}>
        {mode === 'capital'
          ? 'We show a country — type its capital (only capitals allowed). Wrong guesses show the capital and its country.'
          : 'We show a capital — guess its country. Click the globe to fill the box. Wrong guesses show distance & direction.'}
      </div>

      {mode === 'capital' ? (
        <NameTheCapital
          countries={countries}
          capitalIndex={capitalIndex}
          target={targetCapital}
          setTarget={setTargetCapital}
          onNewTarget={handleNewCapitalTarget}
        />
      ) : (
        <NameTheCountry
          countries={countries}
          features={features.filter(f => {
            // only features whose cca3 has a capital
            const c = countries.find(c => c.cca3 === f.properties.cca3);
            return c && c.capital && c.capital.length > 0;
          })}
          worldPolygons={worldPolygons}
          target={targetCountryFeature}
          setTarget={setTargetCountryFeature}
        />
      )}
    </GameShell>
  );
}

export default CapitalQuest;
