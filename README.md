# Neon Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/wuuyboo-oss/neon-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/wuuyboo-oss/neon-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Harbor** is a sun-soaked open-world crime game that runs in a desktop
browser from static files — no build step, no network requests.

You are Rex Marlowe, a wheelman fresh out of Harbor Pen. The fixer Vera Kade
has three jobs for you: a pickup at the docks, a getaway across town, and the
Harbor Bank itself. Explore the city on foot and by car, steal cars, lose the
Harbor PD, fight with fists and a pistol, grab cash, and save your progress.

## How to play

Serve the game (any static server works) and open it in desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` directly from any static file server.

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Shift | Run |
| Mouse drag | Look around (wheel zooms) |
| E | Get in / steal a car · hold to crack the vault |
| Click | Punch / shoot |
| 1 / 2 | Fists / pistol |
| R | Reload |
| Esc | Pause |
| M | Mute |

## What is inside

- A procedural harbor city: 7×7 blocks of pastel buildings, roads, sidewalks,
  palms, street lamps, a plaza fountain, the docks, boats and the harbor water.
- Traffic that drives the road grid, pedestrians who stroll — and flee — and
  police cars and officers who chase you when the heat is on.
- A wanted level (0–5 stars) that rises with crime and fades when you lay low.
- Three story missions with a beacon, minimap blips and a HUD objective line.
- Combat: fists, a pistol with reloads, car explosions, health and a hospital.
- A live minimap, wanted stars, cash, speed, damage flash and screen shake.
- Synthesized WebAudio sound: engine hum, sirens, gunshots and mission jingles.
- Saves in the browser (localStorage): cash, mission progress and position.

## Structure

- `game/index.html` — the page, the HUD and the start/pause/busted screens.
- `game/src/main.js` — boot, the loop and the state machine.
- `game/src/city.js` — the procedural city, colliders and landmarks.
- `game/src/vehicles.js` — cars, arcade driving, traffic AI and police chases.
- `game/src/characters.js` — the player, pedestrians and police on foot.
- `game/src/combat.js` — fists, the pistol, explosions and damage.
- `game/src/wanted.js` — the wanted level and police response.
- `game/src/missions.js` — the three story jobs and cash pickups.
- `game/src/hud.js` — the HUD and the live minimap.
- `game/src/audio.js` — synthesized sound, no audio files.
- `game/src/effects.js` — particles, flashes and the mission beacon.
- `game/src/input.js` — keyboard and mouse.
- `game/src/config.js` — tuning, palette and world layout.
- `game/src/rng.js` — seeded random numbers.
- `game/src/save.js` — save and load.
- `game/vendor/three.module.min.js` — three.js r160, vendored.

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wkz0m1sg&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
