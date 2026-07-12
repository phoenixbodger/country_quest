import React, { useState, useEffect } from 'react';
import { getDistance, getCompassDirection } from 'geolib';
import CountryOutline from './CountryOutline';
import GameGlobe from './GameGlobe';

function App() {
  const [countries, setCountries] = useState([]);
  const [targetCountry, setTargetCountry] = useState(null);
  const [guess, setGuess] = useState("");
  const [validGuess, setValidGuess] = useState(false);
  const [guesses, setGuesses] = useState([]);
  const [gameWon, setGameWon] = useState(false);

  // 1. Load countries.json on page load
  useEffect(() => {
    fetch('/countries.json')
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);

        // For testing purposes, let's pick a random target country initially
        // Later, this could be tied to the daily date
        const randomTarget = sorted[Math.floor(Math.random() * sorted.length)];
        setTargetCountry(randomTarget);
        console.log("Secret Target Country:", randomTarget.name.common); // Check your console!
      })
      .catch(err => console.error("Error loading countries:", err));
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setGuess(value);
    const isValid = countries.some(c => c.name.common.toLowerCase() === value.toLowerCase());
    setValidGuess(isValid);
  };

  // 2. The Distance Calculator Loop
  const submitGuess = (e) => {
      e.preventDefault();
      if (!validGuess || gameWon) return;

      // Find the full country objects for both the guess and the target
      const guessedCountryObj = countries.find(c => c.name.common.toLowerCase() === guess.toLowerCase());
      
      if (guessedCountryObj.name.common === targetCountry.name.common) {
        setGameWon(true);
        // OPTION 1 (WINNING GUESS): Added latlng and cca3 here so it centers and colors yellow on a win!
        setGuesses([{ 
          name: guessedCountryObj.name.common, 
          distance: 0, 
          direction: "🎉",
          latlng: guessedCountryObj.latlng,
          cca3: guessedCountryObj.cca3 
        }, ...guesses]);
      } else {
        // Grab coordinates from your JSON (Format in mledoze repo: [lat, lng])
        const fromCoords = { latitude: guessedCountryObj.latlng[0], longitude: guessedCountryObj.latlng[1] };
        const toCoords = { latitude: targetCountry.latlng[0], longitude: targetCountry.latlng[1] };

        // Calculate distance in meters, then convert to kilometers
        const distanceInMeters = getDistance(fromCoords, toCoords);
        const distanceInKm = Math.round(distanceInMeters / 1000);

        // Calculate compass bearing direction (N, NE, S, SW, etc.)
        const direction = getCompassDirection(fromCoords, toCoords);

        // OPTION 2 (INCORRECT GUESS): Added cca3 property right here next to latlng
        setGuesses([{ 
          name: guessedCountryObj.name.common, 
          distance: distanceInKm, 
          direction, 
          latlng: guessedCountryObj.latlng,
          cca3: guessedCountryObj.cca3 // <-- ADDED THIS RIGHT HERE
        }, ...guesses]);
      }

      // Reset input field
      setGuess("");
      setValidGuess(false);
    };

  // Helper map to turn direction strings into clean directional arrows
  const getArrowEmoji = (dir) => {
    const arrows = { N: "⬆️", NE: "↗️", E: "➡️", SE: "↘️", S: "⬇️", SW: "↙️", W: "⬅️", NW: "↖️" };
    return arrows[dir] || dir;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>🌍 Worldle Globe Game 🌍</h1>
     
      {/* Display the target country's shape using its 3-letter code */}
      {targetCountry && <CountryOutline countryCode={targetCountry.cca3} />}

      {/* Drop the 3D globe right here! Pass it the very first (latest) item in our guesses array */}
      <GameGlobe 
        latestGuessObj={guesses[0]} 
        guesses={guesses} 
        targetCountry={targetCountry} // <-- Pass this down!
      />
      
      {gameWon && <h2 style={{ color: '#48bb78' }}>🎉 You Found It! The country was {targetCountry?.name?.common}!</h2>}

      <form onSubmit={submitGuess} style={{ marginBottom: '30px' }}>
        <input 
          type="text" 
          value={guess} 
          onChange={handleInputChange} 
          placeholder="Type a country name..."
          list="country-list"
          disabled={gameWon}
          style={{ padding: '10px', width: '250px', borderRadius: '5px', border: 'none', fontSize: '16px' }}
        />

        <datalist id="country-list">
          {countries.map((c, idx) => (
            <option key={idx} value={c.name.common} />
          ))}
        </datalist>

        <button 
          type="submit" 
          disabled={!validGuess || gameWon}
          style={{ 
            padding: '10px 20px', 
            marginLeft: '10px', 
            borderRadius: '5px', 
            border: 'none',
            background: validGuess && !gameWon ? '#48bb78' : '#4a5568', 
            color: 'white',
            cursor: validGuess && !gameWon ? 'pointer' : 'not-allowed',
            fontSize: '16px'
          }}
        >
          Guess
        </button>
      </form>

      {/* 3. The Clue Feedback UI Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {guesses.map((g, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            background: g.distance === 0 ? '#2f855a' : '#2d3748',
            padding: '12px 20px', 
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            <span>{g.name}</span>
            <span>{g.distance === 0 ? "Correct!" : `${g.distance.toLocaleString()} km`}</span>
            <span>{getArrowEmoji(g.direction)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
