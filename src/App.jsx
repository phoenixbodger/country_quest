import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import CountryQuest from './screens/CountryQuest';
import FindCountryGame from './screens/FindCountryGame';
import FlagQuest from './screens/FlagQuest';
import CapitalQuest from './screens/CapitalQuest';
import GlobeExplore from './screens/GlobeExplore';
import HowToPlay from './screens/HowToPlay';

function App() {
  const [screen, setScreen] = useState('home');

  const goHome = () => setScreen('home');

  switch (screen) {
    case 'country':
      return <CountryQuest onHome={goHome} />;
    case 'find':
      return <FindCountryGame onHome={goHome} />;
    case 'flag':
      return <FlagQuest onHome={goHome} />;
    case 'capital':
      return <CapitalQuest onHome={goHome} />;
    case 'globe':
      return <GlobeExplore onHome={goHome} />;
    case 'howtoplay':
      return <HowToPlay onHome={goHome} onSelect={setScreen} />;
    default:
      return <HomeScreen onSelect={setScreen} />;
  }
}

export default App;