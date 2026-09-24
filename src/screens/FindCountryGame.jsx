import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import Globe from 'react-globe.gl';
import GameShell from '../components/GameShell';
import { buildCountryIndex, findNearestCountry } from '../nearestCountry';
import { useBorderedEarthTexture } from '../useBorderedEarthTexture';
import FindCountrySetup from './FindCountryGameModes/FindCountrySetup';
import FindCountryStats from './FindCountryGameModes/FindCountryStats';
import { getProximityColor } from '../distanceColors';
import { darkenGraticule } from '../utils/graticule';
import CoordinatesHint from '../components/CoordinatesHint';
import { formatLatLng } from '../utils/formatCoords';

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
  const [popup, setPopup] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showBorders, setShowBorders] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showGraticule, setShowGraticule] = useState(false);
  const [lastClickedCca3, setLastClickedCca3] = useState(null);
  const [highlightCountry, setHighlightCountry] = useState(null);
  const borderedGlobeUrl = useBorderedEarthTexture(worldPolygons, showBorders);

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
  const popupRef = useRef(null);
  useEffect(() => { guessCountRef.current = guessCount; }, [guessCount]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { roundNumberRef.current = roundNumber; }, [roundNumber]);
  useEffect(() => { popupRef.current = popup; }, [popup]);

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
    setPopup(null);
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
          const targetLatLng = target?.properties?.latlng;
          const idx = historyRef.current.length + 1;
          setHistory(h => [...h, { idx, targetName: tName, cca3: tCca3, result: 'incorrect', guesses: g, hintUsed: false, reason: 'timeout', targetLat: targetLatLng?.[0], targetLng: targetLatLng?.[1], targetCca3: tCca3 }]);
          if (targetLatLng) {
            setTried(prev => [...prev, { cca3: tCca3, name: tName, distanceKm: 0, direction: '', lat: targetLatLng[0], lng: targetLatLng[1], color: '#fc8181' }]);
          }
          setRoundOver(true);
          setFailed(true);
          setFailReason('Time is up —');

          const existingPopup = popupRef.current;
          if (existingPopup) {
            setPopup({ ...existingPopup, timedOut: true, name: tName });
          } else if (targetLatLng) {
            setPopup({
              cca3: tCca3,
              name: tName,
              lat: targetLatLng[0],
              lng: targetLatLng[1],
              isWin: false,
              timedOut: true,
              color: '#fc8181',
              distanceKm: 0,
              direction: '',
            });
          }

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
      setPopup(null);
      setPopupPosition({ x: 20, y: 20 });
      setLastClickedCca3(null);
      setHighlightCountry(null);
    }
  }, [roundKey]);

  // Track last clicked/guessed country for pink border
  useEffect(() => {
    if (tried.length > 0) {
      setLastClickedCca3(tried[tried.length - 1].cca3);
    }
  }, [tried.length, tried]);

  const getArrowEmoji = (dir) => {
    const arrows = { N: "⬆️", NE: "↗️", E: "➡️", SE: "↘️", S: "⬇️", SW: "↙️", W: "⬅️", NW: "↖️" };
    return arrows[dir] || dir;
  };

  const resetPopupPosition = useCallback(() => {
    setPopupPosition({ x: 20, y: 20 });
  }, []);

  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    setDragOffset({ x: clientX - popupPosition.x, y: clientY - popupPosition.y });
  }, [popupPosition]);

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;
    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;
    // Constrain within viewport
    const maxX = window.innerWidth - 300; // approximate popup width
    const maxY = window.innerHeight - 150; // approximate popup height
    setPopupPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // only left click
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  // Global drag handlers
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const renderPopupElement = useCallback((d) => {
    const isFailure = !d.isWin && (d.timedOut || d.guessesExhausted || d.isFailure);
    const title = d.isWin ? `🎉 ${d.name}!` : isFailure ? `❌ ${d.name}` : d.name;
    const subtitle = d.isWin
      ? 'Correct!'
      : isFailure
        ? ''
        : `${d.distanceKm.toLocaleString()} km ${getArrowEmoji(d.direction)}`;
    const accentColor = d.isWin ? '#22c55e' : isFailure ? '#fc8181' : d.color;
    const textColor = d.isWin ? '#68d391' : isFailure ? '#fc8181' : d.color;

    return (
      <div
        style={{
          background: '#1a202c',
          border: '1px solid #4a5568',
          borderLeft: `6px solid ${accentColor}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          lineHeight: '1.4',
          color: 'white',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          textAlign: 'left',
          minWidth: '200px',
          cursor: 'move',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: accentColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 'bold' }}>{title}</span>
          </div>
          <button
            onClick={resetPopupPosition}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: '4px',
              opacity: 0.7,
            }}
            title="Reset position"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            ↻
</button>
            </div>
            {subtitle && (
              <div style={{ color: textColor, fontWeight: 'bold', marginTop: '4px' }}>{subtitle}</div>
            )}
            {!d.isWin && (
          <div style={{ color: '#fc8181', fontWeight: 'bold', marginTop: '4px' }}>
            {d.timedOut
              ? 'Incorrect. End of Round. Time is up.'
              : d.alreadyGuessed
              ? 'Already guessed. Please choose again'
              : d.guessesExhausted || d.isFailure
              ? 'Incorrect. End of Round.'
              : 'Incorrect. Try again.'}
          </div>
        )}
      </div>
    );
  }, [resetPopupPosition, getArrowEmoji]);

  const handleWin = (winCca3) => {
    const newGuesses = guessCount + 1;
    setGuessCount(newGuesses);
    const targetLatLng = target?.properties?.latlng;
    const entry = {
      idx: history.length + 1,
      targetName: getTargetName(),
      cca3: getTargetCca3(),
      result: 'correct',
      guesses: newGuesses,
      hintUsed: false,
      reason: 'guessed',
      targetLat: targetLatLng?.[0],
      targetLng: targetLatLng?.[1],
      targetCca3: getTargetCca3(),
    };
    setHistory(prev => [...prev, entry]);
    setRoundOver(true);
    setFailed(false);
    setFailReason(null);
    setLastHint(null);
    const winFeature = features.find(f => f.properties.cca3 === (winCca3 || target?.properties?.cca3));
    const [wLat, wLng] = winFeature?.properties?.latlng || target?.properties?.latlng || [0, 0];
    setPopup({
      cca3: winCca3 || target?.properties?.cca3,
      name: winFeature?.properties?.name || getTargetName(),
      lat: wLat,
      lng: wLng,
      isWin: true,
    });
    clearTimer();
  };

  const handleGuess = (cca3) => {
    if (!target) return;
    if (roundOver) return;
    const existing = tried.find(t => t.cca3 === cca3);
    if (existing) {
      setPopup({ cca3, name: existing.name, distanceKm: existing.distanceKm, direction: existing.direction, lat: existing.lat, lng: existing.lng, color: existing.color, isWin: false, alreadyGuessed: true });
      setLastHint(`${existing.name} is ${existing.distanceKm.toLocaleString()} km from the target ${getArrowEmoji(existing.direction)}.`);
      return;
    }
    if (config && config.maxGuesses != null && guessCount >= config.maxGuesses) return;

    if (cca3 === target.properties.cca3) {
      handleWin(cca3);
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
    const exhausted = config && config.maxGuesses != null && newGuesses >= config.maxGuesses;
    if (exhausted) {
      const targetLatLng = target?.properties?.latlng;
      setPopup({
        cca3: getTargetCca3(),
        name: getTargetName(),
        lat: targetLatLng?.[0] ?? 0,
        lng: targetLatLng?.[1] ?? 0,
        isWin: false,
        guessesExhausted: true,
        isFailure: true,
        color: '#fc8181',
        distanceKm: 0,
        direction: '',
      });
    } else {
      setPopup({ cca3, name: clicked.properties.name, distanceKm, direction, lat: cLat, lng: cLng, color, isWin: false, guessesExhausted: false });
    }

    if (exhausted) {
      const targetLatLng = target?.properties?.latlng;
      const entry = {
        idx: history.length + 1,
        targetName: getTargetName(),
        cca3: getTargetCca3(),
        result: 'incorrect',
        guesses: newGuesses,
        hintUsed: false,
        reason: 'guess limit',
        targetLat: targetLatLng?.[0],
        targetLng: targetLatLng?.[1],
        targetCca3: getTargetCca3(),
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
    const targetLatLng = target?.properties?.latlng;
    const entry = {
      idx: history.length + 1,
      targetName: getTargetName(),
      cca3: getTargetCca3(),
      result: 'incorrect',
      guesses: guessCount,
      hintUsed: false,
      reason: 'skipped',
      targetLat: targetLatLng?.[0],
      targetLng: targetLatLng?.[1],
      targetCca3: getTargetCca3(),
    };
    setHistory(prev => [...prev, entry]);
    setRoundOver(true);
    setFailed(true);
    setFailReason('Skipped —');
    setPopup({
      cca3: getTargetCca3(),
      name: getTargetName(),
      lat: targetLatLng?.[0] ?? 0,
      lng: targetLatLng?.[1] ?? 0,
      isWin: false,
      isFailure: true,
      color: '#fc8181',
      distanceKm: 0,
      direction: '',
    });
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
    setPopup(null);
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
    setPopup(null);
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
    setPopup(null);
    setPopupPosition({ x: 20, y: 20 });
  };

  const focusCountry = ({ lat, lng, cca3 }) => {
    setLastClickedCca3(cca3);
    setHighlightCountry({ cca3, lat, lng });
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
        const isCurrent = lastClickedCca3 && lastClickedCca3.toLowerCase() === cca3;
        const isHighlighted = highlightCountry && highlightCountry.cca3 && highlightCountry.cca3.toLowerCase() === cca3;
        let color = 'rgba(0, 0, 0, 0)';
        let strokeColor = 'rgba(0, 0, 0, 0)';
        let altitude = 0.01;
        if (isHighlighted) {
          color = 'rgba(236, 72, 153, 0.4)';
          strokeColor = '#ec4899';
          altitude = 0.04;
        } else if (isCurrent) {
          strokeColor = '#ff00ff';
          color = 'rgba(255, 0, 255, 0.3)';
          altitude = 0.02;
        } else if (isTarget) {
          color = '#22c55e';
          strokeColor = '#000';
          altitude = 0.03;
        } else if (matched) {
          color = matched.color;
          strokeColor = '#000';
          altitude = 0.02;
        }

        return {
          ...polygon,
          cca3,
          color,
          strokeColor,
          altitude,
        };
      });
  }, [worldPolygons, tried, roundOver, target, lastClickedCca3]);

  const graticuleLabelsData = useMemo(() => {
    if (!showGraticule) return [];
    const labels = [];
    for (let lat = -80; lat <= 80; lat += 10) {
      if (lat === 0) continue;
      labels.push({ lat, lng: 0, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, type: 'graticule' });
      labels.push({ lat, lng: 180, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, type: 'graticule' });
    }
    for (let lng = -170; lng <= 170; lng += 20) {
      if (lng === 0) continue;
      labels.push({ lat: 0, lng, text: `${Math.abs(lng)}°${lng > 0 ? 'E' : 'W'}`, type: 'graticule' });
    }
    labels.push({ lat: 0, lng: 0, text: '0°', type: 'graticule' });
    labels.push({ lat: 0, lng: 180, text: '180°', type: 'graticule' });
    return labels;
  }, [showGraticule]);

  const dotsData = useMemo(() => {
    if (!showLabels) return [];
    return worldPolygons
      .filter(f => f.properties?.cca3 && f.properties?.latlng?.length === 2)
      .map(f => ({
        lat: f.properties.latlng[0],
        lng: f.properties.latlng[1],
        cca3: f.properties.cca3,
        type: 'country-dot',
      }));
  }, [worldPolygons, showLabels]);

  const allLabelsData = useMemo(() => [...dotsData, ...graticuleLabelsData], [dotsData, graticuleLabelsData]);

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

          {target && !roundOver && (
            <CoordinatesHint
              key={target.properties.cca3}
              lat={target.properties.latlng?.[0] ?? 0}
              lng={target.properties.latlng?.[1] ?? 0}
            />
          )}

          {tried.length > 0 && (!roundOver || failed) && (
            <div style={{ color: '#fc8181', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
              {roundOver && failed
                ? 'Incorrect. End of Round.'
                : 'Incorrect. Please choose again'}
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
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a0aec0', fontSize: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={e => setShowLabels(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Show All Countries
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

          <div ref={containerRef} style={{ margin: '10px auto', maxWidth: '560px', position: 'relative' }}>
            <Globe
              ref={globeRef}
              width={globeSize}
              height={globeSize}
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              globeImageUrl={showBorders && borderedGlobeUrl ? borderedGlobeUrl : `${import.meta.env.BASE_URL}earth-8k.jpg`}
              polygonsData={polygonData}
              polygonCapColor="color"
              polygonAltitude="altitude"
              polygonSideColor="rgba(0, 0, 0, 0)"
              polygonStrokeColor={showBorders ? (d) => d.strokeColor || 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0)'}
              polygonHoverColor={roundOver ? "rgba(0, 0, 0, 0)" : "rgba(37, 99, 235, 0.8)"}
              polygonsTransitionDuration={300}
              polygonLabel={showNames ? (p => `<b>${p.properties?.name || ''}</b>`) : null}
              onPolygonClick={showLabels ? null : (p => handleGuess(p.properties?.cca3))}
              onGlobeClick={showLabels ? null : handleMissClick}
              enableAutoRotate={false}
              atmosphereColor="#38bdf8"
              atmosphereAltitude={0.15}

              showGraticules={showGraticule}
              onGlobeReady={() => darkenGraticule(globeRef)}

              htmlElementsData={allLabelsData}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.015}
              htmlTransitionDuration={300}
              htmlElement={d => {
                const el = document.createElement('div');
                const isGraticule = d.type === 'graticule';
                const isCountryDot = d.type === 'country-dot';

                if (isGraticule) {
                  el.style.color = 'rgba(255,255,255,0.6)';
                  el.style.fontSize = '10px';
                  el.style.fontWeight = '500';
                  el.style.whiteSpace = 'nowrap';
                  el.style.pointerEvents = 'none';
                  el.style.userSelect = 'none';
                  el.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';
                  el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))';
                  el.textContent = d.text;
                } else if (isCountryDot) {
                  // Render a clickable dot for each country
                  el.style.width = '10px';
                  el.style.height = '10px';
                  el.style.borderRadius = '50%';
                  el.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  el.style.border = '2px solid rgba(0, 0, 0, 0.8)';
                  el.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(255, 255, 255, 0.4)';
                  el.style.pointerEvents = 'auto';
                  el.style.cursor = 'pointer';
                  el.style.userSelect = 'none';
                  el.style.transition = 'transform 0.1s, box-shadow 0.1s';

                  el.addEventListener('mouseenter', () => {
                    el.style.transform = 'scale(1.5)';
                    el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 255, 255, 0.6)';
                  });
                  el.addEventListener('mouseleave', () => {
                    el.style.transform = 'scale(1)';
                    el.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(255, 255, 255, 0.4)';
                  });

                  el.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (roundOver) return;
                    handleGuess(d.cca3);
                  });
                }

                return el;
              }}
            />
            {popup && (
              <div
                style={{
                  position: 'absolute',
                  left: popupPosition.x,
                  top: popupPosition.y,
                  zIndex: 10,
                  pointerEvents: 'auto',
                  userSelect: 'none',
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {renderPopupElement(popup)}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 'bold' }}>
            {roundOver ? (
              failed ? (
                <span style={{ color: '#fc8181' }}>
                  ❌ {failReason}
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
                    onClick={() => focusCountry({ lat: t.lat, lng: t.lng, cca3: t.cca3 })}
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
                      <span style={{ color: '#a0aec0', fontSize: '12px', fontFamily: 'monospace' }}>{' '}{formatLatLng(t.lat, t.lng)}</span>
                    </span>
                    <span style={{ color: t.color, fontWeight: 'bold' }}>{t.distanceKm.toLocaleString()} km {getArrowEmoji(t.direction)}</span>
                  </button>
                ))}
                {roundOver && target && (
                  <button
                    key={`correct-${target.properties.cca3}`}
                    onClick={() => focusCountry({ lat: target.properties.latlng[0], lng: target.properties.latlng[1], cca3: target.properties.cca3 })}
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
                      background: 'rgba(236, 72, 153, 0.1)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '15px',
                      borderLeft: '6px solid #ec4899',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#ec4899', display: 'inline-block', flexShrink: 0 }} />
                      {target.properties.name}
                      <span style={{ color: '#a0aec0', fontSize: '12px', fontFamily: 'monospace' }}>{' '}{formatLatLng(target.properties.latlng?.[0] ?? 0, target.properties.latlng?.[1] ?? 0)}</span>
                      <span style={{ color: '#ec4899', fontSize: '12px' }}>✓ Correct answer</span>
                    </span>
                    <span style={{ color: '#ec4899', fontWeight: 'bold' }}>—</span>
                  </button>
                )}
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
          onCountryClick={focusCountry}
        />
      )}
    </GameShell>
  );
}

export default FindCountryGame;
