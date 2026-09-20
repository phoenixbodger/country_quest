import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameShell from '../components/GameShell';
import GuessCountryFromCoordinates from './CoordinatesQuestModes/GuessCountryFromCoordinates';
import CoordinatesQuestSetup from './CoordinatesQuestModes/CoordinatesQuestSetup';
import CoordinatesQuestStats from './CoordinatesQuestModes/CoordinatesQuestStats';

import { formatLatLng } from '../utils/formatCoords';

function CoordinatesQuest({ onHome }) {
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [target, setTarget] = useState(null);

  // session state
  const [phase, setPhase] = useState('setup'); // setup | playing | summary
  const [config, setConfig] = useState(null);
  const [roundKey, setRoundKey] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [guessCount, setGuessCount] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [history, setHistory] = useState([]);

  const timerRef = useRef(null);
  const guessCountRef = useRef(guessCount);
  const historyRef = useRef(history);
  const roundNumberRef = useRef(roundNumber);
  const roundOverRef = useRef(roundOver);
  const targetRef = useRef(null);
  useEffect(() => { guessCountRef.current = guessCount; }, [guessCount]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { roundNumberRef.current = roundNumber; }, [roundNumber]);
  useEffect(() => { roundOverRef.current = roundOver; }, [roundOver]);
  useEffect(() => { targetRef.current = target; }, [target]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries-geo.json`)
      .then(r => r.json())
      .then(data => {
        const feats = data.features.filter(f => f.properties?.cca3);
        setFeatures(feats);
        setWorldPolygons(data.features);
        setTarget(feats[Math.floor(Math.random() * feats.length)]);
      })
      .catch(err => console.error("Error loading countries:", err));
    return () => clearTimer();
  }, []);

  const pickNextTarget = useCallback(() => {
    if (!features.length) return;
    let next;
    for (let i = 0; i < 10; i++) {
      next = features[Math.floor(Math.random() * features.length)];
      if (next.properties.cca3 !== target?.properties?.cca3) break;
    }
    setTarget(next);
  }, [features, target]);

  const startSession = (cfg) => {
    setConfig(cfg);
    setHistory([]);
    setRoundNumber(1);
    setGuessCount(0);
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
          endRoundWithFailure('Time is up');
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

  const endRoundWithFailure = (reason) => {
    clearTimer();
    const count = guessCountRef.current;
    const t = targetRef.current;
    setRoundOver(true);
    setFailed(true);
    setFailReason(reason);
    setHistory(prev => [...prev, {
      idx: roundNumberRef.current,
      targetName: t?.properties?.name || '',
      targetLat: t?.properties?.latlng?.[0] ?? null,
      targetLng: t?.properties?.latlng?.[1] ?? null,
      targetCca3: t?.properties?.cca3 || null,
      result: 'incorrect',
      guesses: count,
      reason,
    }]);
  };

  const handleSessionGuess = (cca3, count) => {
    setGuessCount(count);
  };

  const handleWin = (count) => {
    clearTimer();
    setGuessCount(count);
    const t = targetRef.current;
    setRoundOver(true);
    setFailed(false);
    setFailReason(null);
    setHistory(prev => [...prev, {
      idx: roundNumberRef.current,
      targetName: t?.properties?.name || '',
      targetLat: t?.properties?.latlng?.[0] ?? null,
      targetLng: t?.properties?.latlng?.[1] ?? null,
      targetCca3: t?.properties?.cca3 || null,
      result: 'correct',
      guesses: count,
      reason: 'Guessed',
    }]);
  };

  const handleFail = (count) => {
    endRoundWithFailure('Guess limit reached');
  };

  const handleSkip = () => {
    if (roundOverRef.current) return;
    endRoundWithFailure('Skipped');
  };

  const handleNext = () => {
    pickNextTarget();
    if (config.numGames != null && roundNumberRef.current >= config.numGames) {
      setPhase('summary');
      return;
    }
    setRoundNumber(n => n + 1);
    setGuessCount(0);
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
    setRoundKey(k => k + 1);
  };

  const handleEndGame = () => {
    setPhase('summary');
  };

  const handleReplaySame = () => {
    if (config) startSession(config);
  };

  const handleChangeSettings = () => {
    setPhase('setup');
  };

  const stats = {
    history,
    correct: history.filter(h => h.result === 'correct').length,
    incorrect: history.filter(h => h.result === 'incorrect').length,
  };

  // The child owns the globe; this forwards to it while a round's globe is mounted.
  // In the summary phase there is no mounted globe, so it is a safe no-op.
  const focusCountry = () => {};

  const formattedCoords = target?.properties?.latlng
    ? formatLatLng(target.properties.latlng[0], target.properties.latlng[1])
    : '';

  const totalRoundsLabel = config && config.numGames != null ? ` / ${config.numGames}` : '';
  const maxGuessesLabel = config && config.maxGuesses != null ? ` / ${config.maxGuesses}` : '';

  return (
    <GameShell title="📍 Coordinates Quest" onHome={onHome}>
      {phase === 'setup' && (
        <CoordinatesQuestSetup onStart={startSession} />
      )}

      {phase === 'playing' && config && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '14px', color: '#a0aec0', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span>Round <b style={{ color: 'white' }}>{roundNumber}{totalRoundsLabel}</b></span>
            <span>Guesses: <b style={{ color: 'white' }}>{guessCount}{maxGuessesLabel}</b></span>
            {timeLeft != null && (
              <span>⏱ <b style={{ color: timeLeft <= 5 ? '#fc8181' : 'white' }}>{timeLeft}s</b></span>
            )}
          </div>

          {roundOver && (
            <div style={{
              background: failed ? '#742a2a' : '#276749',
              padding: '14px 18px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: failed ? '1px solid #9b2c2c' : 'none',
            }}>
              {failed ? (
                <div style={{ color: '#fed7d7', fontWeight: 'bold', fontSize: '18px' }}>
                  Incorrect. End of Round. The country was <span style={{ color: 'white' }}>{target?.properties?.name || ''}</span>.
                </div>
              ) : (
                <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '18px' }}>
                  🎉 Correct! It was {target?.properties?.name || ''} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
                </div>
              )}
              {failed && (
                <div style={{ color: '#feb2b2', fontSize: '14px', marginTop: '6px' }}>
                  {failReason} — {guessCount} {guessCount === 1 ? 'guess' : 'guesses'} used.
                </div>
              )}
            </div>
          )}

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
                {config.numGames != null && roundNumber >= config.numGames ? 'View stats →' : 'Next question →'}
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

          <div style={{ margin: '10px 0 12px' }}>
            <div style={{ fontSize: '18px', color: '#a0aec0', marginBottom: '6px' }}>Target coordinates:</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#63b3ed', fontFamily: 'monospace' }}>
              {formattedCoords}
            </div>
          </div>

          <GuessCountryFromCoordinates
            key={`${target?.properties?.cca3}-${roundKey}`}
            features={features}
            worldPolygons={worldPolygons}
            target={target}
            sessionMaxGuesses={config.maxGuesses}
            sessionRoundOver={roundOver}
            sessionFailed={failed}
            sessionFailReason={failReason}
            onSessionGuess={handleSessionGuess}
            onSessionWin={handleWin}
            onSessionFail={handleFail}
            onFocusCountry={focusCountry}
          />
        </>
      )}

      {phase === 'summary' && config && (
        <CoordinatesQuestStats
          stats={stats}
          config={config}
          onReplaySame={handleReplaySame}
          onChangeSettings={handleChangeSettings}
          onHome={onHome}
          onCountryClick={focusCountry}
        />
      )}
    </GameShell>
  );
}

export default CoordinatesQuest;
