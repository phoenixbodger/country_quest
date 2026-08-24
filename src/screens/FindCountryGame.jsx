import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import GameShell from '../components/GameShell';
import { buildCountryIndex, findNearestCountry } from '../nearestCountry';
import { useBorderedEarthTexture } from '../useBorderedEarthTexture';
import FindCountrySetup from './FindCountryGameModes/FindCountrySetup';
import FindCountryStats from './FindCountryGameModes/FindCountryStats';
import { getProximityColor } from '../distanceColors';

function FindCountryGame({ onHome }) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [globeSize, setGlobeSize] = useState(400);
  const [features, setFeatures] = useState([]);
  const [worldPolygons, setWorldPolygons] = useState([]);
  const [target, setTarget] = useState(null);

  // per-round state
  const [tried, setTried] = useState([]);
  const [lastHint, setLastHint] = useState(null);
  const [showBorders, setShowBorders] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons);

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
  useEffect(() => { guessCountRef.current = guessCount; }, [guessCount]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { roundNumberRef.current = roundNumber; }, [roundNumber]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setGlobeSize(Math.min(el.clientWidth, 560));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const getTargetName = useCallback(() => target?.properties?.name || '', [target]);
  const getTargetCca3 = useCallback(() => target?.properties?.cca3 || '', [target]);
  const getTargetNameRef = useRef(getTargetName);
  const getTargetCca3Ref = useRef(getTargetCca3);
  useEffect(() => { getTargetNameRef.current = getTargetName; }, [getTargetName]);
  useEffect(() => { getTargetCca3Ref.current = getTargetCca3; }, [getTargetCca3]);

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
    setTried([]);
    setLastHint(null);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
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
          const tName = getTargetNameRef.current();
          const tCca3 = getTargetCca3Ref.current();
          const idx = historyRef.current.length + 1;
          setHistory(h => [...h, { idx, targetName: tName, cca3: tCca3, result: 'incorrect', guesses: g, hintUsed: false, reason: 'timeout' }]);
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

  // centre globe on failure (Q3) and keep highlight
  useEffect(() => {
    if (roundOver && failed && target?.properties?.latlng) {
      const [lat, lng] = target.properties.latlng;
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
      }
    }
  }, [roundOver, failed, target]);

  // reset per-round UI on roundKey change
  useEffect(() => {
    if (phase === 'playing') {
      setTried([]);
      setLastHint(null);
    }
  }, [roundKey]);

  const handleWin = () => {
    const newGuesses = guessCount + 1;
    setGuessCount(newGuesses);
    const entry = {
      idx: history.length + 1,
      targetName: getTargetName(),
      cca3: getTargetCca3(),
      result: 'correct',
      guesses: newGuesses,
      hintUsed: false,
      reason: 'guessed',
    };
    setHistory(prev => [...prev, entry]);
    setRoundOver(true);
    setFailed(false);
    setFailReason(null);
    setLastHint(null);
    clearTimer();
  };

  const handleGuess = (cca3) => {
    if (!target) return;
    if (roundOver) return;
    if (tried.some(t => t.cca3 === cca3)) return;
    if (config && config.maxGuesses != null && guessCount >= config.maxGuesses) return;

    if (cca3 === target.properties.cca3) {
      handleWin();
      return;
    }

    const newGuesses = guessCount + 1;
    setGuessCount(newGuesses);

    const clicked = features.find(f => f.properties.cca3 === cca3);
    if (!clicked) return;
    const [tLat, tLng] = target.properties.latlng;
    const [cLat, cLng] = clicked.properties.latlng;
    const distanceKm = Math.round(getDistance(
      { latitude: cLat, longitude: cLng },
      { latitude: tLat, longitude: tLng }
    ) / 1000);
    const direction = getCompassDirection(
      { latitude: cLat, longitude: cLng },
      { latitude: tLat, longitude: tLng }
    );
    const color = getProximityColor(distanceKm);

    setTried(prev => [...prev, { cca3, name: clicked.properties.name, distanceKm, direction, lat: cLat, lng: cLng, color }]);
    setLastHint(`${clicked.properties.name} is ${distanceKm.toLocaleString()} km from the target ${getArrowEmoji(direction)}.`);

    if (config && config.maxGuesses != null && newGuesses >= config.maxGuesses) {
      const entry = {
        idx: history.length + 1,
        targetName: getTargetName(),
        cca3: getTargetCca3(),
        result: 'incorrect',
        guesses: newGuesses,
        hintUsed: false,
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
      hintUsed: false,
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
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
    setTried([]);
    setLastHint(null);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
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
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
    setRoundKey(k => k + 1);
    setTimeLeft(config.timeLimitSec);
    setPhase('playing');
    setTried([]);
    setLastHint(null);
    pickNextTarget();
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
    }
  };

  const handleChangeSettings = () => {
    clearTimer();
    setPhase('setup');
    setHistory([]);
    setRoundOver(false);
    setFailed(false);
    setFailReason(null);
    setTried([]);
    setLastHint(null);
  };

  const focusCountry = ({ lat, lng }) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
    }
  };

  const countryIndex = useMemo(() => buildCountryIndex(features), [features]);

  const handleMissClick = ({ lat, lng }) => {
    if (roundOver) return;
    const altitude = globeRef.current?.pointOfView()?.altitude ?? 2.5;
    const toleranceKm = Math.min(600, Math.max(20, altitude * 200));
    const nearest = findNearestCountry(countryIndex, lat, lng);
    if (nearest && nearest.distanceKm <= toleranceKm) {
      handleGuess(nearest.cca3);
    }
  };

  const polygonData = useMemo(() => {
    return worldPolygons
      .filter(p => p.geometry && (p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'))
      .map(polygon => {
        const cca3 = (polygon.properties?.cca3 || '').toLowerCase();
        const isTarget = roundOver && target && target.properties.cca3.toLowerCase() === cca3;
        const matched = tried.find(t => t.cca3.toLowerCase() === cca3);
        let color = 'rgba(0, 0, 0, 0)';
        if (isTarget) color = '#22c55e';
        else if (matched) color = matched.color;
        return {
          ...polygon,
          cca3,
          color,
          altitude: isTarget ? 0.03 : matched ? 0.02 : 0.01,
        };
      });
  }, [worldPolygons, tried, roundOver, target]);

  const getArrowEmoji = (dir) => {
    const arrows = { N: "⬆️", NE: "↗️", E: "➡️", SE: "↘️", S: "⬇️", SW: "↙️", W: "⬅️", NW: "↖️" };
    return arrows[dir] || dir;
  };

  const formatTime = (s) => {
    if (s == null) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const stats = {
    history,
    correct: history.filter(h => h.result === 'correct').length,
    correctWithHint: 0,
    incorrect: history.filter(h => h.result === 'incorrect').length,
  };
  const guessesExhausted = config && config.maxGuesses != null && guessCount >= config.maxGuesses;

  return (
    <GameShell title="🔍 Find Country Game" onHome={onHome}>
      {phase === 'setup' && (
        <FindCountrySetup onStart={startSession} />
      )}

      {phase === 'playing' && (
        <>
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
            <span style={{ color: '#4a5568' }}>|</span>
            <span style={{ color: '#68d391' }}>✔ {stats.correct}</span>
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
                {config.numGames != null && history.length >= config.numGames ? 'View stats →' : 'Next country →'}
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

          {target && (
            <div style={{ margin: '10px 0 12px' }}>
              <div style={{ fontSize: '18px', color: '#a0aec0', marginBottom: '6px' }}>Find this country:</div>
              <div style={{ fontSize: '34px', fontWeight: 'bold', color: '#63b3ed' }}>
                {target.properties.name}
              </div>
            </div>
          )}

          <p style={{ color: '#a0aec0', marginBottom: '10px', fontSize: '14px' }}>
            Rotate the globe and click the country you think is the target.
            {showNames
              ? " Hover to see a country's name."
              : " Country names are hidden — tick “Show country names” to reveal them on hover."}
            Scroll to zoom in — small islands get bigger and easier to click.
          </p>

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
                checked={showNames}
                onChange={e => setShowNames(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Show country names
            </label>
          </div>

          <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '560px' }}>
            <Globe
              ref={globeRef}
              width={globeSize}
              height={globeSize}
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              globeImageUrl={showBorders && borderedGlobeUrl ? borderedGlobeUrl : `${import.meta.env.BASE_URL}earth-day.jpg`}
              polygonsData={polygonData}
              polygonCapColor="color"
              polygonAltitude="altitude"
              polygonSideColor="rgba(0, 0, 0, 0)"
              polygonStrokeColor={showBorders ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0)"}
              polygonHoverColor={roundOver ? "rgba(0, 0, 0, 0)" : "rgba(37, 99, 235, 0.8)"}
              polygonsTransitionDuration={300}
              polygonLabel={showNames ? (p => `<b>${p.properties?.name || ''}</b>`) : null}
              onPolygonClick={p => handleGuess(p.properties?.cca3)}
              onGlobeClick={handleMissClick}
              enableAutoRotate={false}
              atmosphereColor="#38bdf8"
              atmosphereAltitude={0.15}
            />
          </div>

          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 'bold' }}>
            {roundOver ? (
              failed ? (
                <span style={{ color: '#fc8181' }}>
                  ❌ {failReason} The answer was {target?.properties?.name}
                </span>
              ) : (
                <span style={{ color: '#48bb78' }}>
                  🎉 Found it in {guessCount} {guessCount === 1 ? 'click' : 'clicks'}!
                </span>
              )
            ) : (
              <span style={{ color: '#a0aec0' }}>
                Clicks: {guessCount}{config.maxGuesses != null ? ` / ${config.maxGuesses}` : ''}
                {guessesExhausted ? ' — no guesses left' : ''}
              </span>
            )}
          </div>

          {lastHint && !roundOver && (
            <div style={{ marginTop: '10px', color: '#f6ad55', fontSize: '16px' }}>{lastHint}</div>
          )}

          {tried.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '15px', color: '#a0aec0', marginBottom: '8px' }}>
                History — click a guess to centre the globe on it
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                {[...tried].reverse().map(t => (
                  <button
                    key={t.cca3}
                    onClick={() => focusCountry(t)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      width: '100%',
                      maxWidth: '360px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid #4a5568',
                      background: '#2d3748',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '15px',
                      borderLeft: `6px solid ${t.color}`,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                      {t.name}
                    </span>
                    <span style={{ color: t.color, fontWeight: 'bold' }}>{t.distanceKm.toLocaleString()} km {getArrowEmoji(t.direction)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'summary' && config && (
        <FindCountryStats
          stats={stats}
          config={config}
          onReplaySame={handleReplaySame}
          onChangeSettings={handleChangeSettings}
          onHome={onHome}
        />
      )}
    </GameShell>
  );
}

export default FindCountryGame;
