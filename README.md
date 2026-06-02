# 🏃 Subway Rush - Endless Runner Game

A complete Subway Surfers-inspired 3D endless runner built with React, TypeScript, Three.js, and React Three Fiber.

## 🎮 Features

- **Full game loop**: Start → Play → Pause → Game Over → Restart
- **3 lane system** with smooth transitions
- **Jump** (with gravity physics) and **Slide** mechanics
- **Procedural infinite world generation** with chunk recycling
- **Obstacle types**: Up barriers (jump over), Down barriers (slide under), Trains (dodge)
- **Collectible coins** with spinning animations
- **Score system** with local best score persistence
- **Chase meter** (police pressure system)
- **3 live missions** with progress tracking
- **Keyboard controls** (WASD / Arrow keys / Space)
- **Touch/swipe controls** for mobile
- **Cinematic third-person camera**
- **Procedural sound effects** (no audio files needed)
- **Responsive UI** matching Subway Surfers aesthetic

## 📁 Asset File Placement

Place your assets in the `public/` directory:

```
public/
├── assets/
│   ├── runner/
│   │   ├── Aj.fbx                    ← Player model
│   │   ├── Running.fbx               ← Run animation
│   │   ├── Running Jump.fbx          ← Jump animation
│   │   └── Running Slide.fbx         ← Slide animation
│   └── Environment/
│       ├── cartoon_building1.glb     ← Building prop
│       ├── cartoon_building2.glb     ← Building prop
│       ├── down_obstacle.glb         ← Slide-under obstacle
│       ├── stylized_tree.glb         ← Tree prop
│       ├── subway_surfers_coin.glb   ← Collectible coin
│       ├── subway_surfers_train.glb  ← Train obstacle
│       └── up_obstacle.glb           ← Jump-over obstacle
```

> **Note**: All assets have built-in fallbacks. If an FBX/GLB fails to load, a colorful geometric placeholder will be used instead. The game is fully playable without any assets.

## 🚀 Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Place your assets
Copy your asset files into `public/assets/` as shown above.

### 3. Start the dev server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for production
```bash
npm run build
npm run preview
```

## 🎯 Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move Left | ← Arrow / A | Swipe Left |
| Move Right | → Arrow / D | Swipe Right |
| Jump | ↑ Arrow / W / Space | Swipe Up / Tap |
| Slide | ↓ Arrow / S | Swipe Down |
| Pause | Escape / P | — |

## 🏗️ Project Structure

```
src/
├── components/
│   ├── game/
│   │   ├── Game.tsx            ← Main game scene (Canvas + UI routing)
│   │   ├── Player.tsx          ← FBX player with animations + collisions
│   │   ├── Track.tsx           ← Ground, rails, sleepers
│   │   ├── Obstacles.tsx       ← All obstacle types with GLB models
│   │   ├── Coins.tsx           ← Spinning collectible coins
│   │   ├── Environment.tsx     ← Buildings, trees, sky, wires
│   │   ├── Lighting.tsx        ← Scene lighting setup
│   │   ├── CameraController.tsx ← Smooth follow camera
│   │   └── WorldManager.tsx    ← Chunk spawning/recycling, game tick
│   └── ui/
│       ├── MainMenu.tsx        ← Start screen
│       ├── HUD.tsx             ← Score, coins, missions, chase meter
│       ├── PauseMenu.tsx       ← Pause + settings
│       ├── GameOver.tsx        ← Results + restart
│       ├── LoadingScreen.tsx   ← Loading indicator
│       └── MobileControls.tsx  ← Touch button overlay
├── hooks/
│   └── useInputHandler.ts     ← Keyboard + swipe input
├── store/
│   └── gameStore.ts           ← Zustand state management
├── utils/
│   ├── chunkGenerator.ts      ← Procedural level generation
│   └── soundManager.ts        ← Procedural audio (no files needed)
├── config/
│   └── constants.ts           ← All game tuning values
└── types/
    └── game.ts                ← TypeScript interfaces
```

## 🎵 Sound

The game uses procedurally generated audio tones via the Web Audio API — no audio files needed! To use real sound effects:

1. Place MP3/OGG files in `public/sounds/`
2. Update `src/utils/soundManager.ts` to load and play them using `new Audio('/sounds/coin.mp3')` etc.

## ⚙️ Tuning & Configuration

All gameplay values are in `src/config/constants.ts`:
- `INITIAL_SPEED` / `MAX_SPEED` — game speed range
- `SPEED_INCREMENT` — how fast difficulty ramps
- `JUMP_FORCE` / `GRAVITY` — jump feel
- `LANE_SWITCH_SPEED` — how snappy lane changes are
- `CHUNK_LENGTH` / `CHUNKS_AHEAD` — world streaming distance
- `SLIDE_DURATION` — how long a slide lasts

## 🔧 FBX Animation Notes

If your FBX animations don't play correctly:
1. The game tries to extract the first animation clip from each FBX file
2. If clips are on a different skeleton, the mixer still works but may look wrong
3. A colorful placeholder character is shown as fallback
4. To fix: Re-export your FBX animations with `bake_all_used_custom_properties=True` from Blender

## 🤝 Performance Tips

- The game targets 60fps on mid-range hardware
- Shadow map size is 2048×2048 — reduce to 1024 if needed in `Lighting.tsx`
- `CHUNKS_AHEAD` controls how far ahead obstacles spawn
- Reduce to 3 if performance is poor on low-end devices
