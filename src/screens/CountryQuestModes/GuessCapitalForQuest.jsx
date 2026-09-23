import React, { useState, useMemo, useEffect } from 'react';
import CountryOutline from '../../CountryOutline';
import CapitalGuessForm from '../../components/CapitalGuessForm';
import HintChoices from '../../components/HintChoices';
import { normalizeCap, getHintCapitals, joinCountryNames } from '../../utils/capitalHelpers';

function GuessCapitalForQuest({ targetCountry, capitalIndex, silhouetteGuessCount, onWon, onFailed, onGuessCountChange, disabled, gameFailed = false, guessLimit = null, onContinue }) {
  const { uniqueCapitals, capitalToCountries } = capitalIndex || { uniqueCapitals: [], capitalToCountries: new Map() };
  const [guessValue, setGuessValue] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [guessCount, setGuessCount] = useState(0);
  const [foundCapitals, setFoundCapitals] = useState(new Set());
  const [gameFullyWon, setGameFullyWon] = useState(false);
  const [capitalFailed, setCapitalFailed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintOptions, setHintOptions] = useState([]);
  const [hintTried, setHintTried] = useState(new Set());
  const [hintReveal, setHintReveal] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  const target = targetCountry;
  
  // Fallback if target is not yet loaded
  if (!target) {
    return (
      <div style={{ color: '#a0aec0', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading capital challenge…</div>
        <div style={{ fontSize: '14px' }}>Please wait while we fetch the next country.</div>
      </div>
    );
  }

  const hasCapital = target?.capital && target.capital.length > 0;
  const totalCapitals = target?.capital?.length || 0;
  const foundCount = foundCapitals.size;
  const isPartialWin = foundCount > 0 && foundCount < totalCapitals && !gameFullyWon;
  const hintCorrect = useMemo(() => {
    if (!target || !target.capital?.length) return null;
    const remaining = target.capital.filter(c => !foundCapitals.has(normalizeCap(c)));
    return remaining[0] || target.capital[0];
  }, [target, foundCapitals]);

  const remainingCapitals = hasCapital ? target.capital.filter(c => !foundCapitals.has(normalizeCap(c))) : [];

  useEffect(() => {
    setGuessValue('');
    setGuesses([]);
    setGuessCount(0);
    setFoundCapitals(new Set());
    setGameFullyWon(false);
    setCapitalFailed(false);
    setShowHint(false);
    setHintOptions([]);
    setHintTried(new Set());
    setHintReveal(null);
    setAdvancing(false);
    if (!hasCapital && onWon) onWon(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.cca3]);

  const handleGuessCapital = (rawCapital) => {
    if (disabled || gameFailed || gameFullyWon) return;
    const lower = normalizeCap(rawCapital);
    if (guesses.some(g => normalizeCap(g.capital) === lower)) return;
    if (foundCapitals.has(lower)) return;

    const nextCount = guessCount + 1;
    setGuessCount(nextCount);
    if (onGuessCountChange) onGuessCountChange(nextCount);
    setGuessValue('');

    const targetLowers = (target.capital || []).map(normalizeCap);
    const isCorrect = targetLowers.includes(lower);

    if (isCorrect) {
      const next = new Set(foundCapitals);
      next.add(lower);
      setFoundCapitals(next);
      const fullyWon = next.size === totalCapitals;
      if (fullyWon) {
        setGameFullyWon(true);
        setShowHint(false);
        if (onWon) onWon(nextCount);
      }

      // Check guess limit after correct guess (if not fully won)
      if (guessLimit && nextCount >= guessLimit && !fullyWon && onFailed) {
        onFailed(nextCount);
      }
      return;
    }

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

    // Check guess limit after wrong guess
    if (guessLimit && nextCount >= guessLimit && onFailed) {
      onFailed(nextCount);
      setCapitalFailed(true);
    }
  };

  const handleHintPick = (opt) => {
    const cap = typeof opt === 'string' ? opt : opt.name || opt;
    const lower = normalizeCap(cap);
    if (disabled || gameFailed || hintTried.has(lower) || gameFullyWon || capitalFailed) return;
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
      const nextCount = guessCount + 1;
      setGuessCount(nextCount);
      if (onGuessCountChange) onGuessCountChange(nextCount);
      const next = new Set(foundCapitals);
      next.add(lower);
      setFoundCapitals(next);
      const fullyWon = next.size === totalCapitals;
      if (fullyWon) {
        setGameFullyWon(true);
        if (onWon) onWon(nextCount);
      }

      // Check guess limit after correct hint pick (if not fully won)
      if (guessLimit && nextCount >= guessLimit && !fullyWon && onFailed) {
        onFailed(nextCount);
        setCapitalFailed(true);
      }
      setShowHint(false);
    } else {
      handleGuessCapital(cap);
      setHintTried(prev => {
        const ns = new Set(prev);
        ns.add(lower);
        return ns;
      });
      // Check if all wrong choices exhausted (3 wrong out of 4 total)
      const wrongOptions = hintOptions.filter(o => !targetLowers.includes(normalizeCap(o)));
      const allWrongTried = wrongOptions.length > 0 && wrongOptions.every(o => hintTried.has(normalizeCap(o)) || normalizeCap(o) === lower);
      if (allWrongTried) {
        setCapitalFailed(true);
      }
    }
  };

  const openHint = () => {
    if (!target || !uniqueCapitals.length || gameFailed) return;
    const correct = hintCorrect;
    const exclude = new Set((target.capital || []).map(normalizeCap));
    const opts = getHintCapitals(correct, uniqueCapitals, 3, exclude);
    setHintOptions(opts);
    setHintTried(new Set());
    setHintReveal(null);
    setShowHint(true);
  };

  if (!target) return <div style={{ color: '#a0aec0' }}>Loading...</div>;

  // No capital case
  if (!hasCapital) {
    const countryName = target?.name?.common || 'this country';
    return (
      <div>
        <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>
          You found <strong style={{ color: 'white' }}>{countryName}</strong> in {silhouetteGuessCount} {silhouetteGuessCount === 1 ? 'guess' : 'guesses'}!
        </div>
        {target?.cca3 && <CountryOutline countryCode={target.cca3} />}
        <div style={{
          display: 'inline-block',
          background: '#2d3748',
          padding: '20px 28px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          marginTop: '10px'
        }}>
          <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{countryName}</div>
          <div style={{ fontSize: '14px', color: '#fbd38d', marginTop: '8px' }}>
            No capital — {countryName} has no capital in our database.
          </div>
        </div>

        <div style={{ background: '#276749', padding: '14px 18px', borderRadius: '8px', marginTop: '12px' }}>
          <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '18px' }}>
            🎉 {countryName} has no capital to guess!
          </div>
          <div style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
            Get ready for the flag!
          </div>
          <button
            onClick={() => {
              if (onContinue) onContinue();
            }}
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#48bb78',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 0 0 0 rgba(72, 187, 120, 0.7)',
              animation: 'pulse-ring 2s infinite',
            }}
          >
            Continue to flag →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>

      <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>
        You found <strong style={{ color: 'white' }}>{target?.name?.common || 'this country'}</strong> in {silhouetteGuessCount} {silhouetteGuessCount === 1 ? 'guess' : 'guesses'}! Now guess its capital.
      </div>

      {target.cca3 && <CountryOutline countryCode={target.cca3} />}

        <div style={{ margin: '12px 0 18px' }}>
        <div style={{
          display: 'inline-block',
          background: '#2d3748',
          padding: '20px 28px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>What is the capital of</div>
          <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{target.name.common}</div>
          {foundCount > 0 && !gameFullyWon && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#68d391' }}>
              Found: {[...foundCapitals].join(', ')} ({foundCount}/{totalCapitals})
            </div>
          )}
        </div>
      </div>

      {isPartialWin && (
        <div style={{ background: '#276749', padding: '14px 18px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '16px' }}>
            🎉 {[...foundCapitals][foundCapitals.size - 1]} is correct! ({foundCount}/{totalCapitals}) {target?.name?.common || 'this country'} has {totalCapitals} capitals.
          </div>
          <div style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
            {remainingCapitals.length === 1 ? `One more to go: can you find the last one?` : `Still need: ${remainingCapitals.join(', ')} — keep guessing!`}
          </div>
        </div>
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

      {!gameFullyWon && !disabled && !gameFailed && (
        <>
          <CapitalGuessForm
            capitals={uniqueCapitals}
            value={guessValue}
            onChange={setGuessValue}
            onGuess={handleGuessCapital}
            disabled={disabled || gameFullyWon}
          />

          {!showHint ? (
            <button
              onClick={openHint}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: '#2d3748',
                color: '#63b3ed',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '16px',
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
                disabled={disabled || gameFullyWon || gameFailed}
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

      <div style={{ fontSize: '15px', color: '#a0aec0', marginBottom: '8px' }}>
        {guesses.length > 0 ? `Wrong guesses — ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'} so far` : `No wrong guesses yet`}
        {foundCount > 0 && !gameFullyWon ? ` • Found ${foundCount}/${totalCapitals}` : ''}
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

      {gameFullyWon ? (
        <div style={{ background: '#276749', padding: '14px 18px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ color: '#c6f6d5', fontWeight: 'bold', fontSize: '18px' }}>
            🎉 Correct! The capital{totalCapitals > 1 ? 's' : ''} of {target?.name?.common || 'this country'} {totalCapitals > 1 ? `are ${target?.capital?.join(', ') || 'unknown'}` : `is ${target?.capital?.[0] || 'unknown'}`} ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'})!
          </div>
          <div style={{ color: '#a0aec0', fontSize: '14px', marginTop: '6px' }}>
            {advancing ? 'Advancing to flag challenge...' : 'Get ready for the flag!'}
          </div>
          <button
            onClick={() => {
              setAdvancing(true);
              if (onContinue) onContinue();
            }}
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#48bb78',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 0 0 0 rgba(72, 187, 120, 0.7)',
              animation: 'pulse-ring 2s infinite',
            }}
          >
            Continue to flag →
          </button>
        </div>
      ) : capitalFailed ? (
        <div style={{ background: '#742a2a', padding: '14px 18px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #9b2c2c' }}>
          <div style={{ color: '#fed7d7', fontWeight: 'bold', fontSize: '18px' }}>
            Incorrect. End of Round. The capital{totalCapitals > 1 ? 's' : ''} of {target?.name?.common || 'this country'} {totalCapitals > 1 ? `are ${target?.capital?.join(', ') || 'unknown'}` : `is ${target?.capital?.[0] || 'unknown'}`}.
          </div>
          <div style={{ color: '#feb2b2', fontSize: '14px', marginTop: '6px' }}>
            ({guessCount} {guessCount === 1 ? 'guess' : 'guesses'}) — Continue to flag challenge.
          </div>
          <button
            onClick={onContinue}
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#3182ce',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Continue to flag →
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default GuessCapitalForQuest;
