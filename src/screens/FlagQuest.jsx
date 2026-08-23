import React, { useState, useEffect } from 'react';
import GameShell from '../components/GameShell';
import GuessCountryFromFlag from './FlagQuestModes/GuessCountryFromFlag';
import GuessFlagFromCountry from './FlagQuestModes/GuessFlagFromCountry';

function FlagQuest({ onHome }) {
  const [mode, setMode] = useState('country'); // 'country' = Flag→Country (globe), 'flag' = Country→Flag (MC 6)
  const [countries, setCountries] = useState([]);
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [targetFlagFeature, setTargetFlagFeature] = useState(null); // feature for Flag→Country globe mode
  const [targetCountry, setTargetCountry] = useState(null); // country obj for Country→Flag MC mode

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
      setTargetFlagFeature(feats[Math.floor(Math.random() * feats.length)]);
      setTargetCountry(sorted[Math.floor(Math.random() * sorted.length)]);
    }).catch(err => console.error("Error loading countries:", err));
  }, []);

  const handleNewFlagTarget = () => {
    if (features.length) {
      setTargetFlagFeature(features[Math.floor(Math.random() * features.length)]);
    }
  };

  const handleNewCountryTarget = () => {
    if (countries.length) {
      setTargetCountry(countries[Math.floor(Math.random() * countries.length)]);
    }
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
    <GameShell title="🚩 Flag Quest" onHome={onHome}>
      <div style={{ display: 'flex', gap: '10px', maxWidth: '520px', margin: '10px auto 18px' }}>
        <button onClick={() => setMode('country')} style={tabStyle(mode === 'country')}>
          🌍 Guess the Country
        </button>
        <button onClick={() => setMode('flag')} style={tabStyle(mode === 'flag')}>
          🏳️ Guess the Flag
        </button>
      </div>
      <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '10px' }}>
        {mode === 'country'
          ? 'We show a flag — guess its country. Click the globe to fill the box. Wrong guesses show distance & direction.'
          : 'We show a country — pick its flag from 6 choices. Wrong picks are disabled; correct shows all flags for learning.'}
      </div>

      {mode === 'country' ? (
        <GuessCountryFromFlag
          countries={countries}
          features={features}
          worldPolygons={worldPolygons}
          target={targetFlagFeature}
          setTarget={setTargetFlagFeature}
        />
      ) : (
        <GuessFlagFromCountry
          countries={countries}
          target={targetCountry}
          setTarget={setTargetCountry}
          onNewTarget={handleNewCountryTarget}
        />
      )}
    </GameShell>
  );
}

export default FlagQuest;
