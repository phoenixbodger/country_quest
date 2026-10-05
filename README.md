# 🌍 Country Quest

A 3D-globe geography game with six ways to play: learn country shapes, flags, capitals and coordinates — or just explore the world.

Built with **React 18**, **Vite** and **react-globe.gl** (three.js), using **d3-geo**, **geolib** and **@turf** for the map math.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # production build (outputs to dist/)
npm run preview    # preview the production build
```

`npm run build:geo` regenerates the bundled geographic assets.

## The six games

| Game | What you do |
|------|-------------|
| 🗺️ **Country Quest** | The full 3-stage challenge — guess the mystery country from its silhouette, then its capital, then its flag. |
| 🔍 **Find Country** | We name a country; find it on the 3D globe. |
| 🚩 **Flag Quest** | Two modes: match a flag to its country on the globe, or pick the right flag from the choices. |
| 🏛️ **Capital Quest** | Two modes: name the capital for a country, or name the country for a capital. |
| 📍 **Coordinates Quest** | We give you a latitude/longitude; find the country on the globe. |
| 🌐 **Globe** | Free explore — spin, zoom, search and click any country to see its flag, capital and facts. |

## How it works

- **The globe is your helper.** In every guessing game you can click a country on the 3D globe to put its name in the answer box — no typing needed.
- **Misses give you a lead.** Wrong guesses show the distance in km plus a compass arrow (⬆️ N, ↗️ NE, ➡️ E, …). The click popup, the in-game history list and the end-of-game stats also show the country's coordinates.
- **Proximity colours.** In Country Quest, Find Country and Coordinates Quest, history dots/cards are colour-coded by how close you were — greener means closer.
- **Hints.** Every mode has a 💡 Hint button that offers 4–6 choices with the correct answer hidden among them.
- **History.** Click any previous guess to centre the globe on that country.

### Globe view

- **Spin / drag** to rotate, **scroll** to zoom (small islands get bigger and easier to click). There is no hover tooltip — turn on **“Show all country names”** to show a clickable dot + name for every country (click either to focus).
- **Toggles:** “Show borders” (country outlines), “Show all country names” (dots + labels), “Show graticule” (lat/long grid).
- **Search:** type a country name and press Search to fly to it.

## Project structure

```
src/
  screens/            One component per game (HomeScreen, HowToPlay, GlobeExplore, …)
    *QuestModes/      Setup / play / stats screens for each game
  components/         Shared UI (GameShell, WorldMap, HintChoices, GlobeZoomControls, …)
  utils/              Distance, coordinates and capital helpers
```

> Full, step-by-step rules for each mode live in the in-app **How to Play** screen.
