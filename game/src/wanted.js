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
  // Any police car close by keeps the heat up.
  const policeNear = G.policeCars.some((c) => {
    const dx = c.pos.x - G.player.pos.x;
    const dz = c.pos.z - G.player.pos.z;
    return Math.hypot(dx, dz) < 45;
  });
  if (policeNear) {
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

/** How many police cars the current heat calls for. */
export function wantedPoliceCount(level) {
  return Math.min(4, level * WANTED.policePerStar);
}
