import React, { useState, useMemo } from 'react';
import CountryOutline from '../../CountryOutline';
import CapitalGuessForm from '../../components/CapitalGuessForm';
import HintChoices from '../../components/HintChoices';
import { normalizeCap, getHintCapitals, joinCountryNames } from '../../utils/capitalHelpers';

function GuessCapitalForQuest({ targetCountry, capitalIndex, onPlayAgain, silhouetteGuessCount }) {
  const { uniqueCapitals, capitalToCountries } = capitalIndex || { uniqueCapitals: [], capitalToCountries: new Map() };
  const [guessValue, setGuessValue] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [guessCount, setGuessCount] = useState(0);
  const [foundCapitals, setFoundCapitals] = useState(new Set());
  const [gameFullyWon, setGameFullyWon] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintOptions, setHintOptions] = useState([]);
  const [hintTried, setHintTried] = useState(new Set());
  const [hintReveal, setHintReveal] = useState(null);

  const target = targetCountry;
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

  const handleHintPick = (opt) => {
    const cap = typeof opt === 'string' ? opt : opt.name || opt;
    const lower = normalizeCap(cap);
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
      handleGuessCapital(cap);
      setHintTried(prev => {
        const ns = new Set(prev);
        ns.add(lower);
        return ns;
      });
    }
  };

  const openHint = () => {
    if (!target || !uniqueCapitals.length) return;
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
    return (
      <div>
        <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>
          You found <strong style={{ color: 'white' }}>{target.name.common}</strong> in {silhouetteGuessCount} {silhouetteGuessCount === 1 ? 'guess' : 'guesses'}!
        </div>
        {target.cca3 && <CountryOutline countryCode={target.cca3} />}
        <div style={{
          display: 'inline-block',
          background: '#2d3748',
          padding: '20px 28px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
          marginTop: '10px'
        }}>
          <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{target.name.common}</div>
          <div style={{ fontSize: '14px', color: '#fbd38d', marginTop: '8px' }}>
            No capital — {target.name.common} has no capital in our database.
          </div>
        </div>

        <div style={{ marginTop: '20px', color: '#a0aec0', fontSize: '15px' }}>
          Quest will continue with flag challenge soon — for now, play another country!
        </div>

        {/* Future extensibility: flag stage will be inserted here. Example:
            stages: ['silhouette','capital','flag']
            if (!hasCapital) auto-skip to flag instead of showing this message.
        */}

        <button
          onClick={onPlayAgain}
          style={{
            marginTop: '18px',
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
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '6px' }}>
        You found <strong style={{ color: 'white' }}>{target.name.common}</strong> in {silhouetteGuessCount} {silhouetteGuessCount === 1 ? 'guess' : 'guesses'}! Now guess its capital.
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

      {gameFullyWon ? (
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
        </div>
      ) : null}

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

      {!gameFullyWon && (
        <>
          <CapitalGuessForm
            capitals={uniqueCapitals}
            value={guessValue}
            onChange={setGuessValue}
            onGuess={handleGuessCapital}
            disabled={gameFullyWon}
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
                disabled={gameFullyWon}
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

      {gameFullyWon && (
        <div style={{ marginTop: '10px' }}>
          {/* Future extensibility: next stage is flag — insert flag challenge button here before Play again.
              Example: <button onClick={onNextFlag}>🏳️ Guess the Flag</button>
              For now we end with Play again. */}
          <button
            onClick={onPlayAgain}
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
        </div>
      )}
    </div>
  );
}

export default GuessCapitalForQuest;
