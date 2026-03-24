# Techno Forge

An algorithmic techno generator for the untz. Build drum patterns, arrange song sections, preview in your browser, and export to MIDI.

## Features

- **Algorithmic pattern generation** — kick, hi-hat, bass, and noise patterns across section types (A, B, Riser)
- **Section arranger** — chain sections in any order with custom lengths (1–64 bars) and colors
- **Real-time playback** — Web Audio API synthesis with live timeline visualization
- **BPM control** — adjustable from 60–200 BPM (default: 128)
- **MIDI export** — downloads a standard `.mid` file ready to drop into any DAW

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `/dist` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Stack

- React 19 + Vite
- Web Audio API
- Lucide icons

## Pattern Types

| Section | Vibe |
|---|---|
| **A** | Four-on-the-floor kick, steady groove |
| **B** | Syncopated, more complex patterns |
| **Riser** | Build-up with increasing density |

Default arrangement: A (16 bars) → Riser (4 bars) → B (16 bars)
