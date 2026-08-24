import React from 'react';
import GameShell from '../components/GameShell';

const SECTIONS = [
  {
    id: 'country',
    emoji: '🗺️',
    title: 'Country Quest',
    subtitle: 'Full Game — 3 stages',
    target: 'country',
    buttonLabel: 'Play Country Quest',
    intro: 'The ultimate challenge. One mystery country, three tests in a row — silhouette, capital, then flag.',
    steps: [
      'Stage 1 — Silhouette: We show the country outline. Type the name or click the globe to fill the guess box, then press Guess.',
      'Wrong guesses show distance + compass direction (e.g. “Brazil is 3,210 km away ↗️”) and a proximity color. History entries are color-coded by proximity — click one to centre the globe on that guess.',
      'Use the 3D globe: rotate, scroll to zoom (small islands get bigger), toggle “Show borders” / “Show All Countries” so islands are easier to find.',
      'Need help? Press 💡 Hint (4 choices) for a multiple-choice pick. You auto-advance to capital after 2 seconds when you win (or press “Continue to capital now”).',
      'Stage 2 — Capital: Type the capital of that same country. We validate only real capitals; wrong guesses show “Paris — capital of France”. Multi-capital countries require all capitals.',
      'Stage 3 — Flag: Pick the correct flag from 6 choices. Wrong flags are disabled with ✗ so you can learn. Finishes with total guess count across all 3 stages.',
    ],
  },
  {
    id: 'find',
    emoji: '🔍',
    title: 'Find Country Game',
    subtitle: 'Globe hunt',
    target: 'find',
    buttonLabel: 'Play Find Country',
    intro: 'We name a country — you find it on the 3D globe.',
    steps: [
      'Rotate the globe and click the country you think is the target.',
      'Miss? We show how far you were and an arrow direction (e.g. “Germany is 1,120 km away ↘️”) and highlight tried countries in red.',
      'History list stores every miss with distance & arrow — click a history entry to centre the globe there.',
      'Toggle “Show borders” for country outlines and “Show country names” for hover labels. Scroll to zoom in on tiny islands.',
      'Win condition: click the exact target country polygon.',
    ],
  },
  {
    id: 'flag',
    emoji: '🚩',
    title: 'Flag Quest',
    subtitle: 'Two modes',
    target: 'flag',
    buttonLabel: 'Play Flag Quest',
    intro: 'Test your flag knowledge both ways.',
    steps: [
      'Mode 1 — Guess the Country (globe): We show a large flag. Type the country or click the globe to fill the box. Wrong guesses show distance & direction on the globe, just like Find Country. Hint gives 6 country names to pick from.',
      'Mode 2 — Guess the Flag (6 choices): We show a country name. Pick its flag from 6 options. Wrong picks turn grey with ✗ and are disabled; correct shows a big flag plus the 5 other options for learning.',
      'Switch modes with the tabs at the top of the Flag Quest screen.',
    ],
  },
  {
    id: 'capital',
    emoji: '🏛️',
    title: 'Capital Quest',
    subtitle: 'Two modes',
    target: 'capital',
    buttonLabel: 'Play Capital Quest',
    intro: 'Capitals and countries — both directions.',
    steps: [
      'Mode 1 — Name the Capital: We show a country name (e.g. “What is the capital of Japan?”). Type its capital — only real capitals are accepted. Wrong guesses show “That capital belongs to…”. Hint gives 4 capitals to choose from. Some countries have multiple capitals — find them all.',
      'Mode 2 — Name the Country (globe): We show a capital (e.g. “Lima”). Guess which country it belongs to — type or click the globe to fill the box. Wrong guesses show distance & direction on the globe. Hint gives 4 countries.',
      'Switch modes with the tabs at the top of the Capital Quest screen.',
    ],
  },
  {
    id: 'globe',
    emoji: '🌐',
    title: 'Globe',
    subtitle: 'Free explore — no quiz',
    target: 'globe',
    buttonLabel: 'Explore Globe',
    intro: 'No scoring, just exploration. Learn the world at your pace.',
    steps: [
      'Spin, drag to rotate, scroll to zoom. Hover any country to see its name.',
      'Click a country to focus on it and see a detail card: flag, official name, capital, region, area, landlocked, languages, borders, and a mini outline.',
      'Use Search: type a country name (with autocomplete) and press Search to fly to it.',
      'Toggles: “Show borders” paints country borders on the earth texture; “Show All Countries” adds persistent labels on the globe.',
      'Use this to study before you quiz — then jump into any game.',
    ],
  },
];

function HowToPlay({ onHome, onSelect }) {
  const handlePlay = (target) => {
    if (onSelect) onSelect(target);
    else if (onHome) onHome();
  };

  return (
    <GameShell title="📖 How to Play" onHome={onHome}>
      <p style={{ color: '#a0aec0', fontSize: '15px', marginBottom: '20px', lineHeight: 1.5 }}>
        Country Quest has five experiences. Pick what you want to learn — shapes, flags, capitals, or just explore.
        Every guessing game lets you click the 3D globe to fill the answer box, and gives hints when you’re stuck.
      </p>

      {/* General tips */}
      <div style={{
        background: '#2d3748',
        border: '1px solid #4a5568',
        borderRadius: '12px',
        padding: '16px 18px',
        marginBottom: '20px',
        textAlign: 'left',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#63b3ed', marginBottom: '8px' }}>💡 General tips for all games</div>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
          <li><span style={{ color: 'white', fontWeight: 600 }}>Globe is your helper:</span> click any country on the globe to put its name in the guess box — you don’t have to type.</li>
          <li><span style={{ color: 'white', fontWeight: 600 }}>Zoom for islands:</span> scroll to zoom in — small islands get much bigger and easier to click. Hover shows the name; toggle persistent names if needed.</li>
          <li><span style={{ color: 'white', fontWeight: 600 }}>Distance & arrows:</span> wrong guesses tell you distance in km + compass arrow (⬆️ N, ↗️ NE, ➡️ E, ↘️ SE, etc.). Follow the arrows to narrow in.</li>
          <li><span style={{ color: 'white', fontWeight: 600 }}>Colors:</span> in Country Quest, history dots/cards are colored by proximity — greener = closer.</li>
          <li><span style={{ color: 'white', fontWeight: 600 }}>Hints:</span> every mode has a 💡 Hint button — usually 4 or 6 choices — the correct answer is hidden among them.</li>
          <li><span style={{ color: 'white', fontWeight: 600 }}>History:</span> click any previous guess to centre the globe on that country.</li>
        </ul>
      </div>

      {/* Game sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
        {SECTIONS.map((sec) => (
          <div
            key={sec.id}
            style={{
              background: '#2d3748',
              borderRadius: '12px',
              padding: '18px 20px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              border: '1px solid #4a5568',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '28px' }}>{sec.emoji}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{sec.title}</span>
              {sec.subtitle && (
                <span style={{ fontSize: '13px', color: '#63b3ed', background: '#1a202c', padding: '3px 8px', borderRadius: '999px', border: '1px solid #4a5568' }}>
                  {sec.subtitle}
                </span>
              )}
              <button
                onClick={() => handlePlay(sec.target)}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#3182ce',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                {sec.buttonLabel} →
              </button>
            </div>
            <p style={{ color: '#a0aec0', fontSize: '14px', margin: '6px 0 10px', lineHeight: 1.5 }}>
              {sec.intro}
            </p>
            <ol style={{ margin: 0, paddingLeft: '18px', color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
              {sec.steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onHome}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#2d3748',
            color: 'white',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
        >
          ← Back to Home
        </button>
        <button
          onClick={() => handlePlay('country')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: '#48bb78',
            color: 'white',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
        >
          Start with Country Quest →
        </button>
      </div>
    </GameShell>
  );
}

export default HowToPlay;
