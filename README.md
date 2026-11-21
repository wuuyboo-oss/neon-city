# Neon Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) [![rank](https://make.fun/badge/gta6-01/wuuyboo-oss/neon-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) [![reward](https://make.fun/badge/gta6-01/wuuyboo-oss/neon-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) ![three.js](https://img.shields.io/badge/three.js-r160-00e5ff)

**Neon Harbor** is a fully original open-world crime game built for the make.fun **gta6-01** bounty ("Make GTA 6"). No Rockstar assets, no real city — a procedural neon city you explore on foot and by car, with traffic, pedestrians, police, combat, and three chained missions worth **$3,300**.

## The jobs

| Mission | Job | Pay |
|---|---|---|
| M1 | Meet the fixer at the hideout front door | $500 |
| M2 | Steal a car and deliver it to the chop shop | $800 |
| M3 | Crack the bank vault (hold E), then lose the heat | $2,000 |

Finish all three and you are **KING OF THE HARBOR**.

## Features

- Procedural neon city: street grid, towers, lamps, neon signs — all generated in code
- On-foot + driving (enter/exit any car with **E**; steal parked or traffic cars)
- Traffic AI driving the streets; pedestrians who flee from you
- Police with wanted level 0–5: they spawn behind you, chase and ram; heat decays when you stay out of sight
- Fists (**F**) + pistol (mouse click), car explosions, cash pickups
- Live minimap, health, cash, wanted stars, mission tracker
- WebAudio synth sound (engine, sirens, shots) — no audio assets
- localStorage save; adaptive quality that latches down if FPS stays low
- Static files under `game/`, no build step, no network request at play

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move / drive |
| Mouse drag | Orbit camera |
| E | Enter / exit car · hold E at the vault to crack it |
| Mouse click | Fire pistol |
| F | Punch |
| Space | Brake |
| R | Restart run |
| M | Mute |

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8901
```

Open http://localhost:8901 and click **START THE NIGHT**.

## Tech

three.js r160 (vendored under `game/vendor/`), ES modules, Node 22 stdlib only for the dev server and submission program (`main.ts`).
