import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import GameShell from '../components/GameShell';
import GuessCountryFromSilhouette from './CountryQuestModes/GuessCountryFromSilhouette';
import GuessCapitalForQuest from './CountryQuestModes/GuessCapitalForQuest';
import GuessFlagForQuest from './CountryQuestModes/GuessFlagForQuest';
import CountryQuestSetup from './CountryQuestModes/CountryQuestSetup';
import CountryQuestStats from './CountryQuestModes/CountryQuestStats';
import { buildCapitalIndex } from '../utils/capitalHelpers';

// Stages: silhouette -> capital (auto-advance 2s) -> flag -> quest complete
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
  const [flagGuessCount, setFlagGuessCount] = useState(0);
  // live counts for timeout/skip breakdown (before win)
  const [silhouetteLive, setSilhouetteLive] = useState(0);
  const [capitalLive, setCapitalLive] = useState(0);
  const [flagLive, setFlagLive] = useState(0);
  const advanceTimerRef = useRef(null);

  const capitalIndex = useMemo(() => {
    if (!countries.length) return { uniqueCapitals: [], capitalToCountries: new Map(), capitalLowerSet: new Set() };
    return buildCapitalIndex(countries);
  }, [countries]);

  // session state
  const [phase, setPhase] = useState('setup'); // setup | playing | summary
  const [config, setConfig] = useState(null);
  const [roundKey, setRoundKey] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [history, setHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [questOver, setQuestOver] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState(null);

  const sessionTimerRef = useRef(null);
  const historyRef = useRef(history);
  const targetCountryRef = useRef(targetCountry);
  const stageRef = useRef(stage);
  const silhouetteGuessCountRef = useRef(silhouetteGuessCount);
  const capitalGuessCountRef = useRef(capitalGuessCount);
  const flagGuessCountRef = useRef(flagGuessCount);
  const silhouetteLiveRef = useRef(silhouetteLive);
  const capitalLiveRef = useRef(capitalLive);
  const flagLiveRef = useRef(flagLive);
  const questOverRef = useRef(questOver);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { targetCountryRef.current = targetCountry; }, [targetCountry]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { silhouetteGuessCountRef.current = silhouetteGuessCount; }, [silhouetteGuessCount]);
  useEffect(() => { capitalGuessCountRef.current = capitalGuessCount; }, [capitalGuessCount]);
  useEffect(() => { flagGuessCountRef.current = flagGuessCount; }, [flagGuessCount]);
  useEffect(() => { silhouetteLiveRef.current = silhouetteLive; }, [silhouetteLive]);
  useEffect(() => { capitalLiveRef.current = capitalLive; }, [capitalLive]);
  useEffect(() => { flagLiveRef.current = flagLive; }, [flagLive]);
  useEffect(() => { questOverRef.current = questOver; }, [questOver]);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };
  const clearSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };

  const pickRandomTarget = (sorted, validSet) => {
    const validTargets = sorted.filter(c => validSet.has(c.cca3));
    if (!validTargets.length) return sorted[Math.floor(Math.random() * sorted.length)];
    return validTargets[Math.floor(Math.random() * validTargets.length)];
  };

  const buildHistoryEntry = (result, reason) => {
    const t = targetCountryRef.current;
    // Determine breakdown based on current stage and live counts
    // If stage is silhouette and not yet won, capital/flag are 0 and silhouette is live count
    // If stage is capital and silhouette already won, use silhouetteGuessCount else live
    // For flag stage similarly
    let s = 0, c = 0, f = 0;
    const st = stageRef.current;
    if (result === 'correct') {
      // quest completed via flag win - all won counts are final
      s = silhouetteGuessCountRef.current;
      c = capitalGuessCountRef.current;
      f = flagGuessCountRef.current;
    } else {
      // incorrect (timeout/skip) - capture progress so far
      if (st === STAGES.SILHOUETTE) {
        s = silhouetteLiveRef.current;
        c = 0;
        f = 0;
      } else if (st === STAGES.CAPITAL) {
        s = silhouetteGuessCountRef.current || silhouetteLiveRef.current;
        c = capitalLiveRef.current;
        f = 0;
      } else if (st === STAGES.FLAG) {
        s = silhouetteGuessCountRef.current || silhouetteLiveRef.current;
        c = capitalGuessCountRef.current || capitalLiveRef.current;
        f = flagLiveRef.current;
      }
    }
    const total = s + c + f;
    return {
      idx: historyRef.current.length + 1,
      targetName: t?.name?.common || '',
      cca3: t?.cca3 || '',
      result,
      guesses: { silhouette: s, capital: c, flag: f, total },
      reason,
    };
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
      clearAdvanceTimer();
      clearSessionTimer();
    };
  }, []);

  const startSession = (cfg) => {
    setConfig(cfg);
    setHistory([]);
    setRoundNumber(1);
    setRoundKey(k => k + 1);
    setStage(STAGES.SILHOUETTE);
    setSilhouetteGuessCount(0);
    setCapitalGuessCount(0);
    setFlagGuessCount(0);
    setSilhouetteLive(0);
    setCapitalLive(0);
    setFlagLive(0);
    setQuestOver(false);
    setFailed(false);
    setFailReason(null);
    setTimeLeft(cfg.timeLimitSec);
    setPhase('playing');
    // ensure fresh target if needed
    if (countries.length && validCca3Set.size) {
      const next = pickRandomTarget(countries, validCca3Set);
      setTargetCountry(next);
      console.log('Secret Target Country:', next.name.common);
    }
    clearAdvanceTimer();
    clearSessionTimer();
  };

  // session timer per quest
  useEffect(() => {
    clearSessionTimer();
    if (phase !== 'playing' || questOver) return;
    if (!config || config.timeLimitSec == null) return;
    sessionTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearSessionTimer();
          clearAdvanceTimer();
          const entry = buildHistoryEntry('incorrect', 'timeout');
          setHistory(h => [...h, entry]);
          setQuestOver(true);
          setFailed(true);
          setFailReason('Time is up —');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearSessionTimer();
  }, [phase, questOver, config, roundKey]);

  // reset timeLeft on new quest
  useEffect(() => {
    if (phase === 'playing' && !questOver && config) {
      if (config.timeLimitSec != null) setTimeLeft(config.timeLimitSec);
      else setTimeLeft(null);
    }
  }, [roundKey, phase]);

  const handleNextQuest = () => {
    const totalAfter = history.length;
    if (config && config.numGames != null && totalAfter >= config.numGames) {
      setPhase('summary');
      clearSessionTimer();
      clearAdvanceTimer();
      return;
    }
    if (!countries.length || !validCca3Set.size) return;
    const next = pickRandomTarget(countries, validCca3Set);
    setTargetCountry(next);
    setStage(STAGES.SILHOUETTE);
    setSilhouetteGuessCount(0);
    setCapitalGuessCount(0);
    setFlagGuessCount(0);
    setSilhouetteLive(0);
    setCapitalLive(0);
    setFlagLive(0);
    setQuestOver(false);
    setFailed(false);
    setFailReason(null);
    setRoundKey(k => k + 1);
    setRoundNumber(n => n + 1);
    console.log('Secret Target Country:', next.name.common);
  };

  const handleSkipQuest = () => {
    if (questOver) return;
    clearAdvanceTimer();
    clearSessionTimer();
    const entry = buildHistoryEntry('incorrect', 'skipped');
    setHistory(h => [...h, entry]);
    setQuestOver(true);
    setFailed(true);
    setFailReason('Skipped —');
  };

  const handleEndGame = () => {
    clearSessionTimer();
    clearAdvanceTimer();
    setPhase('summary');
  };

  const handleReplaySame = () => {
    if (!config) { setPhase('setup'); return; }
    setHistory([]);
    setRoundNumber(1);
    setRoundKey(k => k + 1);
    setStage(STAGES.SILHOUETTE);
    setSilhouetteGuessCount(0);
    setCapitalGuessCount(0);
    setFlagGuessCount(0);
    setSilhouetteLive(0);
    setCapitalLive(0);
    setFlagLive(0);
    setQuestOver(false);
    setFailed(false);
    setFailReason(null);
    setTimeLeft(config.timeLimitSec);
    setPhase('playing');
    if (countries.length && validCca3Set.size) {
      const next = pickRandomTarget(countries, validCca3Set);
      setTargetCountry(next);
      console.log('Secret Target Country:', next.name.common);
    }
  };

  const handleChangeSettings = () => {
    clearSessionTimer();
    clearAdvanceTimer();
    setPhase('setup');
    setHistory([]);
    setQuestOver(false);
    setFailed(false);
    setFailReason(null);
    setSilhouetteGuessCount(0);
    setCapitalGuessCount(0);
    setFlagGuessCount(0);
    setSilhouetteLive(0);
    setCapitalLive(0);
    setFlagLive(0);
    setStage(STAGES.SILHOUETTE);
  };

  const handleSilhouetteWon = (guessCount) => {
    setSilhouetteGuessCount(guessCount);
    setSilhouetteLive(guessCount);
    if (questOver) return;
    // Auto-advance to capital after 2s
    clearAdvanceTimer();
    advanceTimerRef.current = setTimeout(() => {
      if (questOverRef.current) return;
      setStage(STAGES.CAPITAL);
      advanceTimerRef.current = null;
    }, 2000);
  };

  const handleSkipToCapital = () => {
    clearAdvanceTimer();
    setStage(STAGES.CAPITAL);
  };

  const handleCapitalWon = (guessCount) => {
    setCapitalGuessCount(guessCount);
    setCapitalLive(guessCount);
    if (questOver) return;
    clearAdvanceTimer();
    advanceTimerRef.current = setTimeout(() => {
      if (questOverRef.current) return;
      setStage(STAGES.FLAG);
      advanceTimerRef.current = null;
    }, 2000);
  };

  const handleSkipToFlag = () => {
    clearAdvanceTimer();
    setStage(STAGES.FLAG);
  };

  const handleFlagFailed = (flagGuesses) => {
    if (questOverRef.current) return;
    clearSessionTimer();
    clearAdvanceTimer();
    // ensure breakdown captures the final flag guess count (5 of 6) even though state update is async
    flagLiveRef.current = flagGuesses;
    setFlagLive(flagGuesses);
    const entry = buildHistoryEntry('incorrect', 'flag guess limit');
    // fix flag count synchronously in case ref read was stale - patch entry directly
    entry.guesses.flag = flagGuesses;
    entry.guesses.total = entry.guesses.silhouette + entry.guesses.capital + flagGuesses;
    setHistory(h => [...h, entry]);
    setQuestOver(true);
    setFailed(true);
    setFailReason('Too many wrong flags —');
  };

  const handleFlagWon = (guessCount) => {
    setFlagGuessCount(guessCount);
    setFlagLive(guessCount);
    // Quest completed successfully
    clearSessionTimer();
    clearAdvanceTimer();
    // Build correct entry
    const t = targetCountry;
    const s = silhouetteGuessCount || silhouetteLive;
    const c = capitalGuessCount || capitalLive;
    const f = guessCount;
    const total = s + c + f;
    const entry = {
      idx: history.length + 1,
      targetName: t?.name?.common || '',
      cca3: t?.cca3 || '',
      result: 'correct',
      guesses: { silhouette: s, capital: c, flag: f, total },
      reason: 'completed',
    };
    setHistory(prev => [...prev, entry]);
    setQuestOver(true);
    setFailed(false);
    setFailReason(null);
  };

  // Build a feature-like target for silhouette mode
  const silhouetteTarget = useMemo(() => {
    if (!targetCountry) return null;
    const feat = features.find(f => f.properties.cca3 === targetCountry.cca3);
    if (feat) return feat;
    return {
      properties: { cca3: targetCountry.cca3, name: targetCountry.name.common, latlng: targetCountry.latlng },
      cca3: targetCountry.cca3,
    };
  }, [targetCountry, features]);

  const formatTime = (s) => {
    if (s == null) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const stats = {
    history,
    correct: history.filter(h => h.result === 'correct').length,
    incorrect: history.filter(h => h.result === 'incorrect').length,
  };

  const headerStats = (
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
        Q {roundNumber}{config?.numGames != null ? ` / ${config.numGames}` : ' / ∞'}
      </span>
      <span style={{ color: '#4a5568' }}>|</span>
      <span style={{ color: config?.timeLimitSec != null && timeLeft != null && timeLeft <= 10 ? '#fc8181' : '#a0aec0', fontWeight: config?.timeLimitSec != null ? 'bold' : 'normal' }}>
        ⏱ {config?.timeLimitSec == null ? 'No timer' : formatTime(timeLeft)}
      </span>
      <span style={{ color: '#4a5568' }}>|</span>
      <span style={{ color: '#68d391' }}>✔ {stats.correct}</span>
      <span style={{ color: '#fc8181' }}>✘ {stats.incorrect}</span>
    </div>
  );

  const questComplete = questOver && !failed;
  const questFailed = questOver && failed;

  // Answer reveal component for failed/timeout/skip
  const renderAnswerReveal = () => {
    if (!targetCountry) return null;
    const capText = targetCountry.capital && targetCountry.capital.length ? targetCountry.capital.join(', ') : 'No capital';
    return (
      <div style={{ background: '#742a2a', border: '1px solid #9b2c2c', borderRadius: '10px', padding: '16px', margin: '12px auto', maxWidth: '620px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fed7d7', marginBottom: '8px' }}>
          {failReason} The answer was <span style={{ color: 'white' }}>{targetCountry.name.common}</span>
        </div>
        <div style={{ fontSize: '14px', color: '#feb2b2', marginBottom: '10px' }}>
          Capital: <b style={{ color: 'white' }}>{capText}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <img
            src={`${import.meta.env.BASE_URL}maps/${targetCountry.cca3.toLowerCase()}.svg`}
            alt={`Flag of ${targetCountry.name.common}`}
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{ width: '180px', height: '120px', objectFit: 'contain', borderRadius: '6px', border: '2px solid #fc8181', background: 'white' }}
          />
        </div>
        <div style={{ fontSize: '26px' }}>{targetCountry.flag}</div>
        <div style={{ fontSize: '12px', color: '#feb2b2', marginTop: '6px' }}>
          Guesses: S:{silhouetteGuessCount || silhouetteLive} C:{capitalGuessCount || capitalLive} F:{flagLive} (total {(silhouetteGuessCount || silhouetteLive) + (capitalGuessCount || capitalLive) + flagLive})
        </div>
      </div>
    );
  };

  return (
    <GameShell title="🌍 Country Quest" onHome={onHome}>
      {phase === 'setup' && (
        <CountryQuestSetup onStart={startSession} />
      )}

      {phase === 'playing' && (
        <>
          {headerStats}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            {!questOver && (
              <button
                onClick={handleSkipQuest}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #4a5568', background: '#744210', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Skip → Next
              </button>
            )}
            {questOver && (
              <button
                onClick={handleNextQuest}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#3182ce', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                {config.numGames != null && history.length >= config.numGames ? 'View stats →' : 'Next quest →'}
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

          {questFailed && renderAnswerReveal()}

          {!questOver && stage === STAGES.SILHOUETTE && silhouetteTarget && (
            <GuessCountryFromSilhouette
              key={`${targetCountry?.cca3}-${roundKey}`}
              countries={countries}
              features={features}
              worldPolygons={worldPolygons}
              target={silhouetteTarget}
              onWon={handleSilhouetteWon}
              onGuessCountChange={setSilhouetteLive}
              disabled={questOver}
            />
          )}

          {!questOver && stage === STAGES.CAPITAL && targetCountry && (
            <GuessCapitalForQuest
              key={`capital-${targetCountry?.cca3}-${roundKey}`}
              targetCountry={targetCountry}
              capitalIndex={capitalIndex}
              silhouetteGuessCount={silhouetteGuessCount || silhouetteLive}
              onWon={handleCapitalWon}
              onGuessCountChange={setCapitalLive}
              disabled={questOver}
            />
          )}

          {/* Show completion state for silhouette already won but not yet advanced - handled inside components */}
          {stage === STAGES.SILHOUETTE && (silhouetteGuessCount > 0 || silhouetteLive > 0) && !questOver && (
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

          {stage === STAGES.CAPITAL && (capitalGuessCount > 0) && !questOver && (
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

          {stage === STAGES.FLAG && targetCountry && !questFailed && (
            <GuessFlagForQuest
              key={`flag-${targetCountry?.cca3}-${roundKey}`}
              targetCountry={targetCountry}
              countries={countries}
              silhouetteGuessCount={silhouetteGuessCount || silhouetteLive}
              capitalGuessCount={capitalGuessCount || capitalLive}
              onWon={handleFlagWon}
              onFailed={handleFlagFailed}
              onGuessCountChange={setFlagLive}
              disabled={questOver}
              questComplete={questComplete}
              onPlayAgain={handleNextQuest}
            />
          )}

          {questComplete && stage === STAGES.FLAG && (
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={handleNextQuest}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#48bb78', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
              >
                {config.numGames != null && history.length >= config.numGames ? 'View stats →' : 'Next quest →'}
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'summary' && config && (
        <CountryQuestStats
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

export default CountryQuest;
