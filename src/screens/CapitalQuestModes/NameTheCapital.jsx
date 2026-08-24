import React, { useState, useMemo, useEffect } from 'react';
import CapitalGuessForm from '../../components/CapitalGuessForm';
import HintChoices from '../../components/HintChoices';
import { normalizeCap, getHintCapitals, joinCountryNames } from '../../utils/capitalHelpers';

function NameTheCapital({
  countries,
  capitalIndex,
  target,
  setTarget,
  onNewTarget,
  // session props
  sessionActive = false,
  sessionGuessCount = 0,
  sessionMaxGuesses = null,
  sessionHintUsed = false,
  onSessionHintUsed = null,
  onSessionGuess = null,
  onSessionWin = null,
  sessionRoundOver = false,
  sessionFailed = false,
  sessionFailReason = null,
  sessionRoundKey = 0,
}) {
  const { uniqueCapitals, capitalToCountries } = capitalIndex || { uniqueCapitals: [], capitalToCountries: new Map() };
  const [guessValue, setGuessValue] = useState('');
  const [guesses, setGuesses] = useState([]); // [{capital, display}]
  const [guessCount, setGuessCount] = useState(0);
  const [foundCapitals, setFoundCapitals] = useState(new Set()); // normalized capitals found for this target
  const [gameFullyWon, setGameFullyWon] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintOptions, setHintOptions] = useState([]);
  const [hintTried, setHintTried] = useState(new Set());
  const [hintReveal, setHintReveal] = useState(null); // { correct, others: [{capital, display}] }

  const totalCapitals = target?.capital?.length || 0;
  const foundCount = foundCapitals.size;
  const isPartialWin = foundCount > 0 && foundCount < totalCapitals && !gameFullyWon;
  const hintCorrect = useMemo(() => {
    if (!target || !target.capital?.length) return null;
    // For hint we show one of the remaining unfound capitals as correct
    const remaining = target.capital.filter(c => !foundCapitals.has(normalizeCap(c)));
    return remaining[0] || target.capital[0];
  }, [target, foundCapitals]);

  // session derived
  const effectiveWon = sessionActive ? (sessionRoundOver && !sessionFailed) : gameFullyWon;
  const effectiveFailed = sessionActive ? sessionFailed : false;
  const effectiveGuesses = sessionActive ? sessionGuessCount : guessCount;
  const guessesExhausted = sessionActive && sessionMaxGuesses != null && sessionGuessCount >= sessionMaxGuesses;
  const isInputDisabled = sessionActive ? (sessionRoundOver || guessesExhausted) : gameFullyWon;

  // Reset per-round state when session round changes
  useEffect(() => {
    if (sessionActive) {
      setGuesses([]);
      setFoundCapitals(new Set());
      setGameFullyWon(false);
      setShowHint(false);
      setHintOptions([]);
      setHintTried(new Set());
      setHintReveal(null);
      setGuessValue('');
    }
  }, [sessionActive, sessionRoundKey, target?.cca3]);

  const resetState = () => {
    setGuesses([]);
    setGuessCount(0);
    setFoundCapitals(new Set());
    setGameFullyWon(false);
    setShowHint(false);
    setHintOptions([]);
    setHintTried(new Set());
    setHintReveal(null);
    setGuessValue('');
  };

  const newGame = () => {
    resetState();
    if (onNewTarget) onNewTarget();
    else if (countries?.length) {
      const withCapital = countries.filter(c => c.capital && c.capital.length > 0);
      setTarget(withCapital[Math.floor(Math.random() * withCapital.length)]);
    }
  };

  const handleGuessCapital = (rawCapital) => {
    if (gameFullyWon) return;
    const lower = normalizeCap(rawCapital);
    if (guesses.some(g => normalizeCap(g.capital) === lower)) return;
    if (foundCapitals.has(lower)) return;
    setGuessCount(n => n + 1);
    setGuessValue('');

    const targetLowers = (target.capital || []).map(normalizeCap);
    if (targetLowers.includes(lower)) {
      const next = new Set(foundCapitals);
      next.add(lower);
      setFoundCapitals(next);
      if (next.size === totalCapitals) {
        setGameFullyWon(true);
        setShowHint(false);
      }
      return;
    }

    // Wrong guess: find which country this capital belongs to
    const entry = capitalToCountries.get(lower);
    let display;
    if (entry) {
      const names = joinCountryNames(entry.countries);
      display = `${entry.capital} — capital of ${names}`;
    } else {
      display = `${rawCapital} — not a known capital`;
    }
    setGuesses(prev => [{ capital: entry?.capital || rawCapital, display }, ...prev]);

    if (showHint && hintOptions.some(o => normalizeCap(o) === lower)) {
      setHintTried(prev => {
        const ns = new Set(prev);
        ns.add(lower);
        return ns;
      });
    }
  };

  // Simplified session-aware handle for correctly handling win vs partial vs wrong
  // We replaced above branching with more precise logic; re-assign to unified function
  // To avoid duplication, we wrap the session branch more cleanly:
  const handleGuessCapitalUnified = (rawCapital) => {
    if (sessionActive) {
      const lower = normalizeCap(rawCapital);
      if (guesses.some(g => normalizeCap(g.capital) === lower)) return;
      if (foundCapitals.has(lower)) return;
      if (sessionRoundOver || guessesExhausted) return;
      const targetLowers = (target.capital || []).map(normalizeCap);
      const isCorrect = targetLowers.includes(lower);
      if (isCorrect) {
        const next = new Set(foundCapitals);
        next.add(lower);
        setFoundCapitals(next);
        setGuessValue('');
        if (next.size === totalCapitals) {
          // prepare hint reveal if hint was used
          if (hintOptions.length) {
            const others = hintOptions
              .filter(o => normalizeCap(o) !== lower)
              .map(otherCap => {
                const oLower = normalizeCap(otherCap);
                const entry = capitalToCountries.get(oLower);
                const display = entry ? `${entry.capital} — capital of ${joinCountryNames(entry.countries)}` : otherCap;
                return { capital: otherCap, display };
              });
            setHintReveal({ correct: rawCapital, others });
          }
          setShowHint(false);
          const hintAtWin = sessionHintUsed || hintTried.size > 0;
          if (onSessionWin) onSessionWin(hintAtWin);
        } else {
          // partial: count as a guess
          if (onSessionGuess) onSessionGuess(lower, false);
          setShowHint(false);
        }
        return;
      }
      // wrong
      const entry = capitalToCountries.get(lower);
      let display;
      if (entry) {
        const names = joinCountryNames(entry.countries);
        display = `${entry.capital} — capital of ${names}`;
      } else {
        display = `${rawCapital} — not a known capital`;
      }
      setGuesses(prev => [{ capital: entry?.capital || rawCapital, display }, ...prev]);
      setGuessValue('');
      if (showHint && hintOptions.some(o => normalizeCap(o) === lower)) {
        setHintTried(prev => {
          const ns = new Set(prev);
          ns.add(lower);
          return ns;
        });
      }
      if (onSessionGuess) onSessionGuess(lower, false);
      return;
    }
    // non-session
    handleGuessCapital(rawCapital);
  };

  const handleHintPick = (opt) => {
    const cap = typeof opt === 'string' ? opt : opt.name || opt;
    const lower = normalizeCap(cap);
    if (sessionActive) {
      if (hintTried.has(lower) || sessionRoundOver || guessesExhausted) return;
      const targetLowers = (target.capital || []).map(normalizeCap);
      if (targetLowers.includes(lower)) {
        const others = hintOptions
          .filter(o => normalizeCap(o) !== lower)
          .map(otherCap => {
            const oLower = normalizeCap(otherCap);
            const entry = capitalToCountries.get(oLower);
            const display = entry ? `${entry.capital} — capital of ${joinCountryNames(entry.countries)}` : otherCap;
            return { capital: otherCap, display };
          });
        setHintReveal({ correct: cap, others });
        const next = new Set(foundCapitals);
        next.add(lower);
        setFoundCapitals(next);
        setGuessValue('');
        if (next.size === totalCapitals) {
          setShowHint(false);
          if (onSessionHintUsed && !sessionHintUsed) onSessionHintUsed();
          if (onSessionWin) onSessionWin(true);
        } else {
          // partial via hint
          if (onSessionHintUsed && !sessionHintUsed) onSessionHintUsed();
          if (onSessionGuess) onSessionGuess(lower, false);
          setHintTried(prev => {
            const ns = new Set(prev);
            ns.add(lower);
            return ns;
          });
          setShowHint(false);
        }
      } else {
        // wrong via hint
        if (onSessionHintUsed && !sessionHintUsed) onSessionHintUsed();
        // treat as wrong guess
        const entry = capitalToCountries.get(lower);
        let display;
        if (entry) {
          const names = joinCountryNames(entry.countries);
          display = `${entry.capital} — capital of ${names}`;
        } else {
          display = `${cap} — not a known capital`;
        }
        setGuesses(prev => [{ capital: entry?.capital || cap, display }, ...prev]);
        setGuessValue('');
        setHintTried(prev => {
          const ns = new Set(prev);
          ns.add(lower);
          return ns;
        });
        if (onSessionGuess) onSessionGuess(lower, false);
      }
      return;
    }
    if (hintTried.has(lower) || gameFullyWon) return;
    const targetLowers = (target.capital || []).map(normalizeCap);
    if (targetLowers.includes(lower)) {
      const others = hintOptions
        .filter(o => normalizeCap(o) !== lower)
        .map(otherCap => {
          const oLower = normalizeCap(otherCap);
          const entry = capitalToCountries.get(oLower);
          const display = entry ? `${entry.capital} — capital of ${joinCountryNames(entry.countries)}` : otherCap;
          return { capital: otherCap, display };
        });
      setHintReveal({ correct: cap, others });
      setGuessCount(n => n + 1);
      const next = new Set(foundCapitals);
      next.add(lower);
      setFoundCapitals(next);
      if (next.size === totalCapitals) {
        setGameFullyWon(true);
      }
      setShowHint(false);
    } else {
      // Wrong via hint — count as guess and show in history
      // reuse non-session handle
      const entry = capitalToCountries.get(lower);
      let display;
      if (entry) {
        const names = joinCountryNames(entry.countries);
        display = `${entry.capital} — capital of ${names}`;
      } else {
        display = `${cap} — not a known capital`;
      }
      setGuesses(prev => [{ capital: entry?.capital || cap, display }, ...prev]);
      setGuessCount(n => n + 1);
      setGuessValue('');
      setHintTried(prev => {
        const ns = new Set(prev);
        ns.add(lower);
        return ns;
      });
    }
  };

  const openHint = () => {
    if (!target || !uniqueCapitals.length) return;
    if (sessionActive && onSessionHintUsed && !sessionHintUsed) onSessionHintUsed();
    const correct = hintCorrect;
    const exclude = new Set((target.capital || []).map(normalizeCap));
    const opts = getHintCapitals(correct, uniqueCapitals, 3, exclude);
    setHintOptions(opts);
    setHintTried(new Set());
    setHintReveal(null);
    setShowHint(true);
  };

  if (!target) return <div style={{ color: '#a0aec0' }}>Loading...</div>;

  const remainingCapitals = target.capital.filter(c => !foundCapitals.has(normalizeCap(c)));

  // Choose which guess handler to use
  const onGuess = sessionActive ? handleGuessCapitalUnified : handleGuessCapital;

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
          <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>What is the capital of</div>
          <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{target.name.common}</div>
          {foundCount > 0 && !effectiveWon && !effectiveFailed && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#68d391' }}>
              Found: {[...foundCapitals].join(', ')} ({foundCount}/{totalCapitals})
            </div>
          )}
        </div>
      </div>

      {sessionActive ? (
        sessionRoundOver ? (
          effectiveFailed ? (
            <h2 style={{ color: '#fc8181' }}>❌ {sessionFailReason || 'Incorrect'} — The capital{totalCapitals>1?'s':''} of {target.name.common} {totalCapitals>1 ? `are ${target.capital.join(', ')}` : `is ${target.capital[0]}`} </h2>
          ) : (
            <h2 style={{ color: '#48bb78' }}>
              🎉 Correct! {totalCapitals > 1 ? `All capitals of ${target.name.common}: ${target.capital.join(', ')}` : `The capital of ${target.name.common} is ${target.capital[0]}`} ({effectiveGuesses} {effectiveGuesses === 1 ? 'guess' : 'guesses'}){sessionHintUsed ? ' — hint used' : ''}!
            </h2>
          )
        ) : isPartialWin ? (
          <div style={{ background: '#276749', padding: '14px 18px', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '16px' }}>
              🎉 {[...foundCapitals][foundCapitals.size - 1]} is correct! ({foundCount}/{totalCapitals}) {target.name.common} has {totalCapitals} capitals.
            </div>
            <div style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
              {remainingCapitals.length === 1 ? `One more to go: can you find the last one?` : `Still need: ${remainingCapitals.join(', ')} — keep guessing!`}
            </div>
          </div>
        ) : null
      ) : (
        gameFullyWon ? (
          <h2 style={{ color: '#48bb78' }}>
            🎉 Correct! {totalCapitals > 1 ? `All capitals of ${target.name.common}: ${target.capital.join(', ')}` : `The capital of ${target.name.common} is ${target.capital[0]}`} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
          </h2>
        ) : isPartialWin ? (
          <div style={{ background: '#276749', padding: '14px 18px', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '16px' }}>
              🎉 {[...foundCapitals][foundCapitals.size - 1]} is correct! ({foundCount}/{totalCapitals}) {target.name.common} has {totalCapitals} capitals.
            </div>
            <div style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
              {remainingCapitals.length === 1 ? `One more to go: can you find the last one?` : `Still need: ${remainingCapitals.join(', ')} — keep guessing!`}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <span style={{ color: '#a0aec0', fontSize: '14px', alignSelf: 'center' }}>Continue hunting?</span>
              <button
                onClick={newGame}
                style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#4a5568', color: 'white', cursor: 'pointer', fontSize: '14px' }}
              >
                Play again
              </button>
            </div>
          </div>
        ) : null
      )}

      {hintReveal && (
        <div style={{
          background: '#1a202c',
          border: '1px solid #4a5568',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'left',
          maxWidth: '420px',
          margin: '0 auto 16px',
        }}>
          <div style={{ color: '#68d391', fontWeight: 'bold', fontSize: '15px', textAlign: 'center' }}>
            Correct via hint: {(() => {
              const e = capitalToCountries.get(normalizeCap(hintReveal.correct));
              return e ? `${e.capital} — capital of ${joinCountryNames(e.countries)}` : hintReveal.correct;
            })()}
          </div>
          <div style={{ color: '#a0aec0', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>Other choices were:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {hintReveal.others.map((o, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#2d3748',
                  color: '#e2e8f0',
                  fontSize: '14px',
                }}
              >
                {o.display}
              </div>
            ))}
          </div>
        </div>
      )}

      {!effectiveWon && !effectiveFailed && (
        <>
          <CapitalGuessForm
            capitals={uniqueCapitals}
            value={guessValue}
            onChange={setGuessValue}
            onGuess={onGuess}
            disabled={isInputDisabled}
          />

          {!showHint ? (
            <button
              onClick={openHint}
              disabled={isInputDisabled}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: '#2d3748',
                color: '#63b3ed',
                cursor: isInputDisabled ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '16px',
                opacity: isInputDisabled ? 0.5 : 1,
              }}
            >
              💡 Hint (4 choices)
            </button>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '6px' }}>Pick the capital of {target.name.common}:</div>
              <HintChoices
                options={hintOptions}
                correct={hintCorrect}
                triedSet={hintTried}
                onPick={handleHintPick}
                disabled={isInputDisabled}
              />
              <button
                onClick={() => setShowHint(false)}
                style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#4a5568', color: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                Hide hint
              </button>
            </div>
          )}
        </>
      )}

      {sessionActive && !effectiveWon && !effectiveFailed && guessesExhausted && (
        <div style={{ color: '#fc8181', fontSize: '14px', marginBottom: '12px' }}>No guesses left — wait for reveal or skip.</div>
      )}

      <div style={{ fontSize: '15px', color: '#a0aec0', marginBottom: '8px' }}>
        {sessionActive ? (
          sessionRoundOver ? (
            effectiveFailed ? `Failed — ${sessionFailReason || ''} • Capitals: ${target.capital.join(', ')}` : `Finished in ${effectiveGuesses} ${effectiveGuesses === 1 ? 'guess' : 'guesses'}${sessionHintUsed ? ' • hint used' : ''}`
          ) : (
            guesses.length > 0 ? `Wrong guesses — ${effectiveGuesses} ${effectiveGuesses === 1 ? 'guess' : 'guesses'} so far${sessionMaxGuesses != null ? ` / ${sessionMaxGuesses}` : ''}` : `No wrong guesses yet${sessionMaxGuesses != null ? ` • ${effectiveGuesses} / ${sessionMaxGuesses}` : ` • ${effectiveGuesses} guesses`}`
          )
        ) : (
          guesses.length > 0 ? `Wrong guesses — ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'} so far` : `No wrong guesses yet`
        )}
        {foundCount > 0 && !effectiveWon && !effectiveFailed ? ` • Found ${foundCount}/${totalCapitals}` : ''}
      </div>

      {guesses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', marginBottom: '16px' }}>
          {guesses.map((g, idx) => (
            <div
              key={idx}
              style={{
                width: '100%',
                maxWidth: '420px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: '#2d3748',
                color: 'white',
                fontSize: '15px',
                textAlign: 'left',
              }}
            >
              {g.display}
            </div>
          ))}
        </div>
      )}

      {!sessionActive && gameFullyWon && (
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

export default NameTheCapital;
