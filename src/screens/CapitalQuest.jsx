import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import GameShell from '../components/GameShell';
import NameTheCapital from './CapitalQuestModes/NameTheCapital';
import NameTheCountry from './CapitalQuestModes/NameTheCountry';
import CapitalQuestSetup from './CapitalQuestModes/CapitalQuestSetup';
import CapitalQuestStats from './CapitalQuestModes/CapitalQuestStats';
import { buildCapitalIndex } from '../utils/capitalHelpers';

function CapitalQuest({ onHome }) {
  const [mode, setMode] = useState('capital'); // 'capital' = Name the Capital, 'country' = Name the Country
  const [countries, setCountries] = useState([]);
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [targetCapital, setTargetCapital] = useState(null); // country obj for NameTheCapital
  const [targetCountryFeature, setTargetCountryFeature] = useState(null); // feature for NameTheCountry

  // session
  const [phase, setPhase] = useState('setup'); // setup | playing | summary
  const [config, setConfig] = useState(null);
  const [roundKey, setRoundKey] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [guessCount, setGuessCount] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [history, setHistory] = useState([]);

  const timerRef = useRef(null);
  const guessCountRef = useRef(guessCount);
  const hintUsedRef = useRef(hintUsed);
  const historyRef = useRef(history);
  const roundNumberRef = useRef(roundNumber);
  useEffect(() => { guessCountRef.current = guessCount; }, [guessCount]);
  useEffect(() => { hintUsedRef.current = hintUsed; }, [hintUsed]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { roundNumberRef.current = roundNumber; }, [roundNumber]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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
    return () => clearTimer();
  }, []);

  const getTargetName = useCallback(() => {
    if (mode === 'capital') return targetCapital?.name?.common || '';
    return targetCountryFeature?.properties?.name || '';
  }, [mode, targetCapital, targetCountryFeature]);

  const getTargetCca3 = useCallback(() => {
    if (mode === 'capital') return targetCapital?.cca3 || '';
    return targetCountryFeature?.properties?.cca3 || '';
  }, [mode, targetCapital, targetCountryFeature]);

  const getTargetNameRef = useRef(getTargetName);
  const getTargetCca3Ref = useRef(getTargetCca3);
  useEffect(() => { getTargetNameRef.current = getTargetName; }, [getTargetName]);
  useEffect(() => { getTargetCca3Ref.current = getTargetCca3; }, [getTargetCca3]);

  const pickNextTarget = useCallback(() => {
    if (mode === 'capital') {
      const withCapital = countries.filter(c => c.capital && c.capital.length > 0);
      if (withCapital.length) {
        let next;
        for (let i = 0; i < 10; i++) {
          next = withCapital[Math.floor(Math.random() * withCapital.length)];
          if (next.cca3 !== targetCapital?.cca3) break;
        }
        setTargetCapital(next);
      }
    } else {
      const cca3Set = new Set(countries.filter(c => c.capital && c.capital.length > 0).map(c => c.cca3));
      const geoWithCapital = features.filter(f => cca3Set.has(f.properties.cca3));
      const pool = geoWithCapital.length ? geoWithCapital : features;
      if (pool.length) {
        let next;
        for (let i = 0; i < 10; i++) {
          next = pool[Math.floor(Math.random() * pool.length)];
          if (next.properties.cca3 !== targetCountryFeature?.properties?.cca3) break;
        }
        setTargetCountryFeature(next);
      }
    }
  }, [mode, countries, features, targetCapital, targetCountryFeature]);

  const handleNewCapitalTarget = () => {
    const withCapital = countries.filter(c => c.capital && c.capital.length > 0);
    setTargetCapital(withCapital[Math.floor(Math.random() * withCapital.length)]);
  };

  const startSession = (cfg) => {
    setConfig(cfg);
    setHistory([]);
    setRoundNumber(1);
    setGuessCount(0);
    setHintUsed(false);
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
    setRoundKey(k => k + 1);
    setTimeLeft(cfg.timeLimitSec);
    setPhase('playing');
  };

  // timer effect
  useEffect(() => {
    clearTimer();
    if (phase !== 'playing' || roundOver) return;
    if (!config || config.timeLimitSec == null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearTimer();
          const g = guessCountRef.current;
          const hUsed = hintUsedRef.current;
          const tName = getTargetNameRef.current();
          const tCca3 = getTargetCca3Ref.current();
          const idx = historyRef.current.length + 1;
          setHistory(h => [...h, { idx, targetName: tName, cca3: tCca3, result: 'incorrect', guesses: g, hintUsed: hUsed, reason: 'timeout' }]);
          setRoundOver(true);
          setFailed(true);
          setFailReason('Time is up —');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimer();
  }, [phase, roundOver, config, roundKey]);

  // reset timeLeft on new round
  useEffect(() => {
    if (phase === 'playing' && !roundOver && config) {
      if (config.timeLimitSec != null) setTimeLeft(config.timeLimitSec);
      else setTimeLeft(null);
    }
  }, [roundKey, phase]);

  const handleWin = (hintAtWin) => {
    const h = hintAtWin != null ? hintAtWin : hintUsed;
    const newGuesses = guessCount + 1;
    setGuessCount(newGuesses);
    const result = h ? 'correct_hint' : 'correct';
    const reason = h ? 'hint used' : 'guessed';
    const entry = {
      idx: history.length + 1,
      targetName: getTargetName(),
      cca3: getTargetCca3(),
      result,
      guesses: newGuesses,
      hintUsed: h,
      reason,
    };
    setHistory(prev => [...prev, entry]);
    setRoundOver(true);
    setFailed(false);
    setFailReason(null);
    clearTimer();
  };

  const handleWrongGuess = (cca3, isCorrect) => {
    if (isCorrect) {
      handleWin(hintUsed);
      return;
    }
    const newGuesses = guessCount + 1;
    setGuessCount(newGuesses);
    if (config && config.maxGuesses != null && newGuesses >= config.maxGuesses) {
      const entry = {
        idx: history.length + 1,
        targetName: getTargetName(),
        cca3: getTargetCca3(),
        result: 'incorrect',
        guesses: newGuesses,
        hintUsed,
        reason: 'guess limit',
      };
      setHistory(prev => [...prev, entry]);
      setRoundOver(true);
      setFailed(true);
      setFailReason('Guess limit reached —');
      clearTimer();
    }
  };

  const handleSkip = () => {
    if (roundOver) return;
    const entry = {
      idx: history.length + 1,
      targetName: getTargetName(),
      cca3: getTargetCca3(),
      result: 'incorrect',
      guesses: guessCount,
      hintUsed,
      reason: 'skipped',
    };
    setHistory(prev => [...prev, entry]);
    setRoundOver(true);
    setFailed(true);
    setFailReason('Skipped —');
    clearTimer();
  };

  const handleNext = () => {
    const totalAfter = history.length;
    if (config && config.numGames != null && totalAfter >= config.numGames) {
      setPhase('summary');
      clearTimer();
      return;
    }
    pickNextTarget();
    setRoundKey(k => k + 1);
    setRoundNumber(n => n + 1);
    setGuessCount(0);
    setHintUsed(false);
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
  };

  const handleEndGame = () => {
    clearTimer();
    setPhase('summary');
  };

  const handleReplaySame = () => {
    if (!config) { setPhase('setup'); return; }
    setHistory([]);
    setRoundNumber(1);
    setGuessCount(0);
    setHintUsed(false);
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
    setRoundKey(k => k + 1);
    setTimeLeft(config.timeLimitSec);
    setPhase('playing');
    pickNextTarget();
  };

  const handleChangeSettings = () => {
    clearTimer();
    setPhase('setup');
    setHistory([]);
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
  };

  const stats = {
    history,
    correct: history.filter(h => h.result === 'correct').length,
    correctWithHint: history.filter(h => h.result === 'correct_hint').length,
    incorrect: history.filter(h => h.result === 'incorrect').length,
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    background: active ? '#3182ce' : '#2d3748',
    color: 'white',
    cursor: phase === 'playing' ? 'not-allowed' : 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    opacity: phase === 'playing' ? 0.6 : 1,
  });

  const formatTime = (s) => {
    if (s == null) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const filteredFeatures = features.filter(f => {
    const c = countries.find(c => c.cca3 === f.properties.cca3);
    return c && c.capital && c.capital.length > 0;
  });

  return (
    <GameShell title="🏛️ Capital Quest" onHome={onHome}>
      {phase === 'setup' && (
        <>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '520px', margin: '10px auto 18px' }}>
            <button onClick={() => setMode('capital')} style={tabStyle(mode === 'capital')} disabled={phase === 'playing'}>
              🏙️ Name the Capital
            </button>
            <button onClick={() => setMode('country')} style={tabStyle(mode === 'country')} disabled={phase === 'playing'}>
              🌍 Name the Country
            </button>
          </div>
          <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '10px' }}>
            {mode === 'capital'
              ? 'We show a country — type its capital (only capitals allowed). Wrong guesses show the capital and its country.'
              : 'We show a capital — guess its country. Click the globe to fill the box. Wrong guesses show distance & direction.'}
          </div>
          <CapitalQuestSetup key={mode} onStart={startSession} initialMode={mode} />
        </>
      )}

      {phase === 'playing' && (
        <>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '520px', margin: '10px auto 12px', opacity: 0.9 }}>
            <button disabled style={tabStyle(mode === 'capital')}> {mode === 'capital' ? '🏙️ Name the Capital' : '🌍 Name the Country'}</button>
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignItems: 'center',
            background: '#1a202c',
            border: '1px solid #2d3748',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '14px',
            color: '#e2e8f0',
          }}>
            <span style={{ fontWeight: 'bold' }}>
              Q {roundNumber}{config.numGames != null ? ` / ${config.numGames}` : ' / ∞'}
            </span>
            <span style={{ color: '#4a5568' }}>|</span>
            <span>Guesses: <b>{guessCount}</b>{config.maxGuesses != null ? ` / ${config.maxGuesses}` : ''}</span>
            <span style={{ color: '#4a5568' }}>|</span>
            <span style={{ color: config.timeLimitSec != null && timeLeft != null && timeLeft <= 10 ? '#fc8181' : '#a0aec0', fontWeight: config.timeLimitSec != null ? 'bold' : 'normal' }}>
              ⏱ {config.timeLimitSec == null ? 'No timer' : formatTime(timeLeft)}
            </span>
            {hintUsed && <><span style={{ color: '#4a5568' }}>|</span><span style={{ color: '#63b3ed' }}>hint used</span></>}
            <span style={{ color: '#4a5568' }}>|</span>
            <span style={{ color: '#68d391' }}>✔ {stats.correct + stats.correctWithHint}</span>
            <span style={{ color: '#fc8181' }}>✘ {stats.incorrect}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            {!roundOver && (
              <button
                onClick={handleSkip}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4a5568', background: '#744210', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Skip → Next
              </button>
            )}
            {roundOver && (
              <button
                onClick={handleNext}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#3182ce', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                {config.numGames != null && history.length >= config.numGames ? 'View stats →' : 'Next question →'}
              </button>
            )}
            <button
              onClick={handleEndGame}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4a5568', background: '#822727', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              End Game
            </button>
            <button
              onClick={handleChangeSettings}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4a5568', background: '#2d3748', color: '#a0aec0', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Change settings
            </button>
          </div>

          {mode === 'capital' ? (
            <NameTheCapital
              countries={countries}
              capitalIndex={capitalIndex}
              target={targetCapital}
              setTarget={setTargetCapital}
              onNewTarget={handleNewCapitalTarget}
              sessionActive
              sessionGuessCount={guessCount}
              sessionMaxGuesses={config.maxGuesses}
              sessionHintUsed={hintUsed}
              onSessionHintUsed={() => setHintUsed(true)}
              onSessionGuess={handleWrongGuess}
              onSessionWin={handleWin}
              sessionRoundOver={roundOver}
              sessionFailed={failed}
              sessionFailReason={failReason}
              sessionRoundKey={roundKey}
            />
          ) : (
            <NameTheCountry
              countries={countries}
              features={filteredFeatures}
              worldPolygons={worldPolygons}
              target={targetCountryFeature}
              setTarget={setTargetCountryFeature}
              sessionActive
              sessionGuessCount={guessCount}
              sessionMaxGuesses={config.maxGuesses}
              sessionHintUsed={hintUsed}
              onSessionHintUsed={() => setHintUsed(true)}
              onSessionGuess={handleWrongGuess}
              onSessionWin={handleWin}
              sessionRoundOver={roundOver}
              sessionFailed={failed}
              sessionFailReason={failReason}
              sessionRoundKey={roundKey}
            />
          )}
        </>
      )}

      {phase === 'summary' && config && (
        <CapitalQuestStats
          stats={stats}
          config={config}
          mode={mode}
          onReplaySame={handleReplaySame}
          onChangeSettings={handleChangeSettings}
          onHome={onHome}
        />
      )}
    </GameShell>
  );
}

export default CapitalQuest;
