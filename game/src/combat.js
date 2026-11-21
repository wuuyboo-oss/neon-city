// Combat: fists (F) up close, pistol (mouse click) at range. Shooting a cop raises heat.
// Killing a pedestrian drops a cash pickup.
import { dist2 } from './rng.js';
import { explodeCar } from './police.js';

export function stepCombat(state, input, dt) {
  const p = state.player;
  state.punchCd = Math.max(0, (state.punchCd || 0) - dt);
  state.shotCd = Math.max(0, (state.shotCd || 0) - dt);
  if (state.inCar) return;
  // Fists.
  if (input.wasPressed('KeyF') && state.punchCd <= 0) {
    state.punchCd = 0.5; state.audio?.punch();
    hitNearest(state, 2.5, 34, false);
  }
  // Pistol.
  if (input.clicked && state.shotCd <= 0) {
    input.clicked = false; // one click, one shot — not one per simulation step
    state.shotCd = 0.35; state.audio?.shot();
    state.muzzle = 0.08;
    hitNearest(state, 40, 50, true);
  }
  state.muzzle = Math.max(0, (state.muzzle || 0) - dt);
}

function hitNearest(state, range, dmg, ranged) {
  const p = state.player;
  let best = null, bestD = range * range, bestKind = null;
  for (const ped of state.peds) {
    if (!ped.alive) continue;
    const d2 = dist2(ped.x, ped.z, p.x, p.z);
    if (d2 < bestD) { best = ped; bestD = d2; bestKind = 'ped'; }
  }
  for (const c of state.police) {
    const d2 = dist2(c.x, c.z, p.x, p.z);
    if (d2 < bestD) { best = c; bestD = d2; bestKind = 'cop'; }
  }
  if (!best) return;
  if (bestKind === 'ped') {
    best.hp -= dmg; best.panic = 2;
    if (best.hp <= 0) {
      best.alive = false;
      state.pickups.push({ x: best.x, z: best.z, kind: 'cash', amount: 25, t: 0 });
      state.wanted = Math.min(5, state.wanted + 1);
    }
  } else {
    // Shooting a cop: they take the hit and the heat rises.
    state.wanted = Math.min(5, state.wanted + 1);
    state.flash = 'You shot a cop! Wanted up.';
  }
}

export function stepPickups(state, dt) {
  const p = state.player;
  for (const pk of state.pickups) {
    pk.t += dt;
    if (dist2(p.x, p.z, pk.x, pk.z) < 2.5 * 2.5) {
      state.cash += pk.amount; pk.taken = true;
      state.audio?.pickup();
      state.flash = `+$${pk.amount}`;
      state.save?.();
    }
  }
  state.pickups = state.pickups.filter(pk => !pk.taken && pk.t < 30);
}

export { explodeCar };
