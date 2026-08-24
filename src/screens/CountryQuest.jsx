import React, { useState, useEffect, useMemo, useRef } from 'react';
import GameShell from '../components/GameShell';
import GuessCountryFromSilhouette from './CountryQuestModes/GuessCountryFromSilhouette';
import GuessCapitalForQuest from './CountryQuestModes/GuessCapitalForQuest';
import GuessFlagForQuest from './CountryQuestModes/GuessFlagForQuest';
import { buildCapitalIndex } from '../utils/capitalHelpers';

// Stages: silhouette -> capital (auto-advance 2s) -> flag (auto-advance 2s) -> play again
const STAGES = {
  SILHOUETTE: 'silhouette',
  CAPITAL: 'capital',
  FLAG: 'flag',
};

function CountryQuest({ onHome }) {
  const [countries, setCountries] = useState([]);
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [validCca3Set, setValidCca3Set] = useState(new Set());
  const [targetCountry, setTargetCountry] = useState(null);
  const [stage, setStage] = useState(STAGES.SILHOUETTE);
  const [silhouetteGuessCount, setSilhouetteGuessCount] = useState(0);
  const [capitalGuessCount, setCapitalGuessCount] = useState(0);
  const timerRef = useRef(null);

  const capitalIndex = useMemo(() => {
    if (!countries.length) return { uniqueCapitals: [], capitalToCountries: new Map(), capitalLowerSet: new Set() };
    return buildCapitalIndex(countries);
  }, [countries]);

  const pickRandomTarget = (sorted, validSet) => {
    const validTargets = sorted.filter(c => validSet.has(c.cca3));
    if (!validTargets.length) return sorted[Math.floor(Math.random() * sorted.length)];
    return validTargets[Math.floor(Math.random() * validTargets.length)];
  };

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}countries.json`).then(r => r.json()),
      fetch(`${import.meta.env.BASE_URL}countries-geo.json`).then(r => r.json()),
      fetch(`${import.meta.env.BASE_URL}valid-countries.json`).then(r => r.json()),
    ])
      .then(([allCountries, geo, validCca3]) => {
        const validSet = new Set(validCca3);
        const sorted = allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
        setValidCca3Set(validSet);
        const feats = geo.features.filter(f => f.properties?.cca3);
        setFeatures(feats);
        setWorldPolygons(geo.features);
        const randomTarget = pickRandomTarget(sorted, validSet);
        setTargetCountry(randomTarget);
        console.log('Secret Target Country:', randomTarget.name.common);
      })
      .catch(err => console.error('Error loading countries:', err));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleNewRound = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!countries.length || !validCca3Set.size) {
      setStage(STAGES.SILHOUETTE);
      setSilhouetteGuessCount(0);
      setCapitalGuessCount(0);
      return;
    }
    const next = pickRandomTarget(countries, validCca3Set);
    setTargetCountry(next);
    setStage(STAGES.SILHOUETTE);
    setSilhouetteGuessCount(0);
    setCapitalGuessCount(0);
    console.log('Secret Target Country:', next.name.common);
  };

  const handleSilhouetteWon = (guessCount) => {
    setSilhouetteGuessCount(guessCount);
    // Auto-advance to capital after 2s, keeping silhouette visible in next stage
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStage(STAGES.CAPITAL);
      timerRef.current = null;
    }, 2000);
  };

  const handleSkipToCapital = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStage(STAGES.CAPITAL);
  };

  const handleCapitalWon = (guessCount) => {
    setCapitalGuessCount(guessCount);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStage(STAGES.FLAG);
      timerRef.current = null;
    }, 2000);
  };

  const handleSkipToFlag = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStage(STAGES.FLAG);
  };

  // Build a feature-like target for silhouette mode (needs properties.cca3/name)
  // We keep targetCountry as source of truth; silhouette mode can handle both shapes.
  const silhouetteTarget = useMemo(() => {
    if (!targetCountry) return null;
    // try to find matching feature for richer props, but fallback to country object
    const feat = features.find(f => f.properties.cca3 === targetCountry.cca3);
    if (feat) return feat;
    // synthetic feature-like object so GuessCountryFromSilhouette works
    return {
      properties: { cca3: targetCountry.cca3, name: targetCountry.name.common, latlng: targetCountry.latlng },
      cca3: targetCountry.cca3,
    };
  }, [targetCountry, features]);

  return (
    <GameShell title="🌍 Country Quest" onHome={onHome}>
      {stage === STAGES.SILHOUETTE && silhouetteTarget && (
        <>
          <GuessCountryFromSilhouette
            key={targetCountry?.cca3}
            countries={countries}
            features={features}
            worldPolygons={worldPolygons}
            target={silhouetteTarget}
            onWon={handleSilhouetteWon}
          />
          {/* Optional manual advance button appears after win, before auto-advance */}
          {/* This is rendered inside GuessCountryFromSilhouette's won state, but we also offer a quick skip here if needed */}
        </>
      )}

      {stage === STAGES.CAPITAL && targetCountry && (
        <GuessCapitalForQuest
          key={`capital-${targetCountry?.cca3}`}
          targetCountry={targetCountry}
          capitalIndex={capitalIndex}
          silhouetteGuessCount={silhouetteGuessCount}
          onWon={handleCapitalWon}
          onPlayAgain={handleNewRound}
        />
      )}

      {stage === STAGES.FLAG && targetCountry && (
        <GuessFlagForQuest
          key={`flag-${targetCountry?.cca3}`}
          targetCountry={targetCountry}
          countries={countries}
          silhouetteGuessCount={silhouetteGuessCount}
          capitalGuessCount={capitalGuessCount}
          onPlayAgain={handleNewRound}
        />
      )}

      {/* If silhouette won, allow instant skip to capital (accessibility) */}
      {stage === STAGES.SILHOUETTE && silhouetteGuessCount > 0 && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handleSkipToCapital}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #4a5568',
              background: '#2d3748',
              color: '#63b3ed',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Continue to capital now →
          </button>
        </div>
      )}

      {stage === STAGES.CAPITAL && capitalGuessCount > 0 && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handleSkipToFlag}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #4a5568',
              background: '#2d3748',
              color: '#63b3ed',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Continue to flag now →
          </button>
        </div>
      )}
    </GameShell>
  );
}

export default CountryQuest;
