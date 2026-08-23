export function normalizeCap(s) {
  return (s || '').trim().toLowerCase();
}

export function buildCapitalIndex(countries) {
  const capitalToCountries = new Map(); // lower -> { capital: original, countries: [] }
  const uniqueCapitalsSet = new Set();
  const uniqueCapitals = [];
  const lowerToOriginal = new Map();

  for (const c of countries) {
    if (!c.capital || !c.capital.length) continue;
    for (const cap of c.capital) {
      const lower = normalizeCap(cap);
      if (!lower) continue;
      if (!capitalToCountries.has(lower)) {
        capitalToCountries.set(lower, { capital: cap, countries: [] });
      }
      capitalToCountries.get(lower).countries.push(c);
      if (!lowerToOriginal.has(lower)) {
        lowerToOriginal.set(lower, cap);
        uniqueCapitals.push(cap);
      }
    }
  }
  uniqueCapitals.sort((a, b) => a.localeCompare(b));
  const capitalLowerSet = new Set(capitalToCountries.keys());
  return { capitalToCountries, uniqueCapitals, capitalLowerSet };
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getHintCapitals(correctCapital, uniqueCapitals, n = 3, excludeLowers = null) {
  const correctLower = normalizeCap(correctCapital);
  const exclude = excludeLowers ? new Set([...excludeLowers].map(normalizeCap)) : null;
  const pool = uniqueCapitals.filter(c => {
    const l = normalizeCap(c);
    if (l === correctLower) return false;
    if (exclude && exclude.has(l)) return false;
    return true;
  });
  const shuffled = shuffleArray(pool);
  const distractors = shuffled.slice(0, n);
  return shuffleArray([...distractors, correctCapital]);
}

export function getHintCountries(correctCca3, features, n = 3) {
  const pool = features.filter(f => f.properties?.cca3 !== correctCca3);
  const shuffled = shuffleArray(pool);
  const distractors = shuffled.slice(0, n).map(f => ({
    cca3: f.properties.cca3,
    name: f.properties.name,
  }));
  const correctFeature = features.find(f => f.properties.cca3 === correctCca3);
  const correct = correctFeature ? { cca3: correctFeature.properties.cca3, name: correctFeature.properties.name } : null;
  if (!correct) return distractors;
  return shuffleArray([...distractors, correct]);
}

export function joinCountryNames(countries) {
  return countries.map(c => c.name.common).join(', ');
}
