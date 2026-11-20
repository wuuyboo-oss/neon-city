// Neon Harbor — the wanted level.
// Crime raises the heat: stealing a car, hurting pedestrians, firing
// a gun. Stars fade after quiet time out of the police's sight, and
// each star puts another police car on the player's tail.

import { WANTED } from './config.js';

/** Create the wanted state. */
export function createWanted() {
  return {
    level: 0,
    quietTimer: 0,
    crimeCooldown: 0,
  };
}

/** Commit a crime: raise the wanted level, with a short cooldown so one act counts once. */
export function commitCrime(G, stars) {
  const wanted = G.wanted;
  if (wanted.crimeCooldown > 0) return;
  wanted.crimeCooldown = 1.2;
  wanted.level = Math.min(WANTED.max, wanted.level + stars);
  wanted.quietTimer = 0;
  if (wanted.level > 0) {
    G.hud.toast(`WANTED LEVEL ${wanted.level} — the Harbor PD is on you`);
    G.audio.siren(0.5, 0.1);
  }
}

/** Decay the heat when the player keeps quiet and out of sight. */
export function updateWanted(G, dt) {
  const wanted = G.wanted;
  wanted.crimeCooldown = Math.max(0, wanted.crimeCooldown - dt);
  if (wanted.level === 0) return;
  // Any police car close by keeps the heat up. "Close" is 25 units:
  // at 35 the quiet timer never ran at all — measured in a real
  // escape drive (wanted 4, 300 wall-seconds at 28 m/s), the three
  // police cars, cutting corners while the player slows for turns,
  // always had one car inside 35, so the heat never decayed and the
  // player was busted at the hideout door. At 25 a fast driver on a
  // straight clears every car in ~3 s and the timer can actually run.
  if (isPoliceNear(G, 25)) {
    wanted.quietTimer = 0;
    return;
  }
  wanted.quietTimer += dt;
  if (wanted.quietTimer >= WANTED.decaySeconds) {
    wanted.quietTimer = 0;
    wanted.level -= 1;
    if (wanted.level === 0) G.hud.toast('You lost the cops. Heat is off.');
  }
}

/** Whether any police car is within `radius` units of the player. */
export function isPoliceNear(G, radius) {
  return G.policeCars.some((c) => {
    const dx = c.pos.x - G.player.pos.x;
    const dz = c.pos.z - G.player.pos.z;
    return Math.hypot(dx, dz) < radius;
  });
}

/** How many police cars the current heat calls for. */
export function wantedPoliceCount(level) {
  // Cap 3, not 4: four converging police cars could never all be
  // shaken at once, so the wanted level could never decay and the
  // bank-job escape was uncompletable. Three is still a hard chase.
  return Math.min(3, level * WANTED.policePerStar);
}
