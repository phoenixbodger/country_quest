import React, { useState, useEffect } from 'react';
import { shuffleArray } from '../../utils/capitalHelpers';

function GuessFlagFromCountry({
  countries,
  target,
  setTarget,
  onNewTarget,
  // session props
  sessionActive = false,
  sessionGuessCount = 0,
  sessionMaxGuesses = null,
  onSessionGuess = null,
  onSessionWin = null,
  sessionRoundOver = false,
  sessionFailed = false,
  sessionFailReason = null,
  sessionRoundKey = 0,
}) {
  const [guessCount, setGuessCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [options, setOptions] = useState([]);
  const [tried, setTried] = useState(new Set());
  const [hintReveal, setHintReveal] = useState(null); // { correct: {cca3,name,flag}, others: [{cca3,name,flag}] }
  const [flagErrors, setFlagErrors] = useState(new Set());
  const [revealFlagErrors, setRevealFlagErrors] = useState(new Set());

  const buildOptions = (targetCountry) => {
    if (!targetCountry || !countries.length) return [];
    const correct = { cca3: targetCountry.cca3, name: targetCountry.name.common, flag: targetCountry.flag };
    const pool = countries.filter(c => c.cca3 !== targetCountry.cca3);
    const shuffled = shuffleArray(pool);
    const distractors = shuffled.slice(0, 5).map(c => ({ cca3: c.cca3, name: c.name.common, flag: c.flag }));
    return shuffleArray([...distractors, correct]);
  };

  useEffect(() => {
    if (target) {
      setOptions(buildOptions(target));
      setTried(new Set());
      setHintReveal(null);
      setFlagErrors(new Set());
      setRevealFlagErrors(new Set());
      if (!sessionActive) {
        setGuessCount(0);
        setGameWon(false);
      }
    }
  }, [target, countries]);

  // Session round reset
  useEffect(() => {
    if (sessionActive) {
      setTried(new Set());
      setHintReveal(null);
      setFlagErrors(new Set());
      setRevealFlagErrors(new Set());
      setGameWon(false);
      // options rebuilt via above effect but also ensure rebuild on roundKey
      if (target) setOptions(buildOptions(target));
    }
  }, [sessionActive, sessionRoundKey]);

  // When session indicates round over, build reveal (for both success and fail so answer visible)
  useEffect(() => {
    if (sessionActive && sessionRoundOver && target && options.length) {
      const correctOpt = options.find(o => o.cca3 === target.cca3) || { cca3: target.cca3, name: target.name.common, flag: target.flag };
      const others = options.filter(o => o.cca3 !== target.cca3).map(o => ({ cca3: o.cca3, name: o.name, flag: o.flag }));
      // if already have hintReveal from win, keep it; otherwise create for fail
      if (!hintReveal || hintReveal.correct.cca3 !== correctOpt.cca3) {
        setHintReveal({ correct: correctOpt, others });
      }
    }
    if (sessionActive && !sessionRoundOver) {
      setHintReveal(null);
    }
  }, [sessionActive, sessionRoundOver, target, options]);

  const newGame = () => {
    setGuessCount(0);
    setGameWon(false);
    setTried(new Set());
    setHintReveal(null);
    setFlagErrors(new Set());
    setRevealFlagErrors(new Set());
    if (onNewTarget) {
      onNewTarget();
    } else if (countries.length) {
      const next = countries[Math.floor(Math.random() * countries.length)];
      setTarget(next);
    }
  };

  const handlePick = (opt) => {
    const cca3 = opt.cca3;
    if (sessionActive) {
      if (tried.has(cca3) || sessionRoundOver) return;
      if (sessionMaxGuesses != null && sessionGuessCount >= sessionMaxGuesses) return;
      const isCorrect = cca3 === target.cca3;
      if (isCorrect) {
        if (onSessionWin) onSessionWin();
        const others = options
          .filter(o => o.cca3 !== cca3)
          .map(o => ({ cca3: o.cca3, name: o.name, flag: o.flag }));
        setHintReveal({ correct: opt, others });
      } else {
        setTried(prev => {
          const ns = new Set(prev);
          ns.add(cca3);
          return ns;
        });
        if (onSessionGuess) onSessionGuess(cca3, false);
      }
      return;
    }
    if (tried.has(cca3) || gameWon) return;
    setGuessCount(n => n + 1);
    if (cca3 === target.cca3) {
      // Correct - build reveal for other 5
      const others = options
        .filter(o => o.cca3 !== cca3)
        .map(o => ({ cca3: o.cca3, name: o.name, flag: o.flag }));
      setHintReveal({ correct: opt, others });
      setGameWon(true);
    } else {
      setTried(prev => {
        const ns = new Set(prev);
        ns.add(cca3);
        return ns;
      });
    }
  };

  if (!target) return <div style={{ color: '#a0aec0' }}>Loading...</div>;

  const effectiveGuessCount = sessionActive ? sessionGuessCount : guessCount;
  const effectiveWon = sessionActive ? (sessionRoundOver && !sessionFailed) : gameWon;
  const effectiveFailed = sessionActive ? sessionFailed : false;
  const guessesExhausted = sessionActive && sessionMaxGuesses != null && sessionGuessCount >= sessionMaxGuesses;
  const disabledAll = sessionActive ? (sessionRoundOver || guessesExhausted) : gameWon;

  return (
    <div>
      <div style={{ margin: '20px 0' }}>
        <div style={{
          display: 'inline-block',
          background: '#2d3748',
          padding: '20px 28px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>What is the flag of</div>
          <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{target.name.common}</div>
        </div>
      </div>

      {sessionActive ? (
        sessionRoundOver ? (
          sessionFailed ? (
            <h2 style={{ color: '#fc8181' }}>❌ {sessionFailReason || 'Incorrect'} — The flag of {target.name.common}</h2>
          ) : (
            <h2 style={{ color: '#48bb78' }}>
              🎉 Correct! The flag of {target.name.common} ({effectiveGuessCount} {effectiveGuessCount === 1 ? 'guess' : 'guesses'})!
            </h2>
          )
        ) : (
          <div style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '12px' }}>
            Pick the correct flag — wrong guesses will be disabled. {sessionMaxGuesses != null ? `Guesses: ${effectiveGuessCount} / ${sessionMaxGuesses}` : `Guesses: ${effectiveGuessCount}`}
            {guessesExhausted ? ' — no guesses left' : ''}
          </div>
        )
      ) : (
        gameWon ? (
          <h2 style={{ color: '#48bb78' }}>
            🎉 Correct! The flag of {target.name.common} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
          </h2>
        ) : (
          <div style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '12px' }}>
            Pick the correct flag — wrong guesses will be disabled.
          </div>
        )
      )}

      {(sessionActive ? (sessionRoundOver && hintReveal) : hintReveal) && hintReveal && (
        <div style={{
          background: '#1a202c',
          border: '1px solid #4a5568',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'left',
          maxWidth: '620px',
          margin: '0 auto 16px',
        }}>
          <div style={{ color: effectiveFailed ? '#fc8181' : '#68d391', fontWeight: 'bold', fontSize: '15px', textAlign: 'center', marginBottom: '10px' }}>
            {effectiveFailed ? `Answer: ${hintReveal.correct.name}` : `Correct: ${hintReveal.correct.name}`}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            {revealFlagErrors.has(hintReveal.correct.cca3) ? (
              <span style={{ fontSize: '80px' }}>{hintReveal.correct.flag}</span>
            ) : (
              <img
                src={`${import.meta.env.BASE_URL}maps/${hintReveal.correct.cca3.toLowerCase()}.svg`}
                alt={`Flag of ${hintReveal.correct.name}`}
                onError={() => setRevealFlagErrors(prev => {
                  const ns = new Set(prev);
                  ns.add(hintReveal.correct.cca3);
                  return ns;
                })}
                style={{ width: '180px', height: '120px', objectFit: 'contain', borderRadius: '6px', border: `2px solid ${effectiveFailed ? '#fc8181' : '#48bb78'}` }}
              />
            )}
          </div>
          <div style={{ color: '#a0aec0', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>Other choices were:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
            {hintReveal.others.map((o, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#2d3748',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {revealFlagErrors.has(o.cca3) ? (
                  <span style={{ fontSize: '48px' }}>{o.flag}</span>
                ) : (
                  <img
                    src={`${import.meta.env.BASE_URL}maps/${o.cca3.toLowerCase()}.svg`}
                    alt={`Flag of ${o.name}`}
                    onError={() => setRevealFlagErrors(prev => {
                      const ns = new Set(prev);
                      ns.add(o.cca3);
                      return ns;
                    })}
                    style={{ width: '90px', height: '60px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                )}
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{o.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!disabledAll || (sessionActive && !sessionRoundOver) ? (
        (!sessionActive && !gameWon) || (sessionActive && !sessionRoundOver) ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
            maxWidth: '620px',
            margin: '12px auto 16px',
          }}>
            {options.map((opt) => {
              const isTried = tried.has(opt.cca3);
              const disabled = disabledAll || isTried || guessesExhausted;
              return (
                <button
                  key={opt.cca3}
                  onClick={() => handlePick(opt)}
                  disabled={disabled}
                  aria-label={`Flag of ${opt.name}`}
                  title={isTried ? `${opt.name} ✗` : undefined}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #4a5568',
                    background: isTried ? '#4a5568' : '#2d3748',
                    color: isTried ? '#a0aec0' : 'white',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: isTried ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '84px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {flagErrors.has(opt.cca3) ? (
                    <span style={{ fontSize: '48px' }}>{opt.flag}</span>
                  ) : (
                    <img
                      src={`${import.meta.env.BASE_URL}maps/${opt.cca3.toLowerCase()}.svg`}
                      alt={`Flag of ${opt.name}`}
                      onError={() => setFlagErrors(prev => {
                        const ns = new Set(prev);
                        ns.add(opt.cca3);
                        return ns;
                      })}
                      style={{ width: '120px', height: '80px', objectFit: 'contain', borderRadius: '4px', display: 'block' }}
                    />
                  )}
                  {isTried && (
                    <span style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.45)',
                      color: 'white',
                      fontSize: '28px',
                      fontWeight: 'bold',
                    }}>✗</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null
      ) : null}

      {/* when failed and no hintReveal yet but round over, options still disabled - hide grid */}
      {sessionActive && sessionRoundOver && guessesExhausted && !hintReveal ? null : null}

      <div style={{ fontSize: '15px', color: '#a0aec0', marginBottom: '8px' }}>
        {sessionActive ? (
          sessionRoundOver ? `Finished in ${effectiveGuessCount} ${effectiveGuessCount === 1 ? 'guess' : 'guesses'}` : `Guesses: ${effectiveGuessCount}${sessionMaxGuesses != null ? ` / ${sessionMaxGuesses}` : ''} • Pick a flag above`
        ) : (
          gameWon ? `Finished in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}` : `Guesses: ${guessCount} • Pick a flag above`
        )}
      </div>

      {!sessionActive && gameWon && (
        <button
          onClick={newGame}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#48bb78',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Play again
        </button>
      )}
    </div>
  );
}

export default GuessFlagFromCountry;
