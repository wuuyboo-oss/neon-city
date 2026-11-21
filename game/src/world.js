// World state + the fixed-step simulation. Owns the player, cars, peds, cops, pickups,
// wanted level, and mission flow; subsystems do the per-entity work.
import { mulberry32, dist2, angleLerp, clamp } from './rng.js';
import { buildCity, colliders } from './city.js';
import { moveCircle, clampToCity, stepCar } from './physics.js';
import { spawnTraffic, stepTraffic } from './traffic.js';
import { spawnPeds, stepPeds } from './pedestrians.js';
import { stepPolice, explodeCar } from './police.js';
import { stepMissions } from './missions.js';
import { stepCombat, stepPickups } from './combat.js';
import { PLAYER, CAR, SPAWN, CITY, MISSIONS } from './config.js';

export function createWorld(seed = 1337, audio = null) {
  const rng = mulberry32(seed);
  const city = buildCity(seed);
  const state = {
    seed, rng, city, cols: colliders(city), audio,
    time: 0, started: false, won: false, paused: false,
    player: { x: SPAWN.x, z: SPAWN.z, angle: Math.PI, hp: PLAYER.hp, speed: 0 },
    camYaw: Math.PI, // camera looks toward -z at spawn (fwd = (0,-1))
    cash: 0, wanted: 0, quietT: 0, nearestPolice: Infinity,
    mission: 0, vaultStep: 0, vaultProgress: 0, heatSet: false,
    inCar: false, car: null,
    cars: spawnTraffic(rng, null),
    peds: spawnPeds(rng),
    police: [], pickups: [],
    flash: '', flashT: 0, muzzle: 0, punchCd: 0, shotCd: 0,
    fps: 60, frameT: 0, lowT: 0, quality: 'high', qualityLatched: false,
    save: null,
  };
  // A few cash pickups scattered on the streets.
  for (let i = 0; i < 6; i++) {
    state.pickups.push({ x: (rng() - 0.5) * 260, z: (rng() - 0.5) * 260, kind: 'cash', amount: 50, t: 0 });
  }
  return state;
}

export function resetWorld(state, keepCash = false) {
  const cash = keepCash ? state.cash : 0;
  const fresh = createWorld(state.seed, state.audio);
  Object.keys(fresh).forEach(k => { state[k] = fresh[k]; });
  state.cash = cash;
  state.started = true;
}

export function nearestCar(state, maxD = 4) {
  let best = null, bestD = maxD * maxD;
  for (const c of state.cars) {
    if (c.exploded) continue;
    const d2 = dist2(c.x, c.z, state.player.x, state.player.z);
    if (d2 < bestD) { best = c; bestD = d2; }
  }
  return best;
}

export function stepWorld(state, input, dt) {
  if (!state.started || state.paused) return;
  state.time += dt;
  const p = state.player;
  // NOTE: camYaw is rotated once per animation frame in main.js, not here — applying it
  // per simulation step would multiply a drag by the step count on slow frames.
  const ax = input.axis();

  if (state.inCar && state.car) {
    const sp = stepCar(state.car, input, dt, state.cols);
    p.x = state.car.x; p.z = state.car.z; p.angle = state.car.angle; p.speed = sp;
    state.audio?.engine(sp / CAR.maxSpeed);
    // Exit the car: pick a spot beside the car that is NOT inside a building, so the
    // player can never spawn stuck inside a collider.
    if (input.wasPressed('KeyE') && Math.abs(state.car.speed) < 3) {
      const c = state.car;
      const spots = [];
      for (let k = 0; k < 4; k++) {
        const a = c.angle + (Math.PI / 2) * k;
        spots.push([c.x + Math.sin(a) * 3.5, c.z + Math.cos(a) * 3.5]);
      }
      spots.push([c.x, c.z + 5], [c.x, c.z - 5], [c.x + 5, c.z], [c.x - 5, c.z]);
      let spot = spots[0];
      for (const [sx, sz] of spots) {
        const inside = state.cols.some(col => sx + 1 > col.minX && sx - 1 < col.maxX && sz + 1 > col.minZ && sz - 1 < col.maxZ);
        if (!inside) { spot = [sx, sz]; break; }
      }
      state.inCar = false;
      p.x = spot[0]; p.z = spot[1];
      p.angle = c.angle;
      state.car = null;
      state.audio?.engine(0);
    }
    // Ram a pedestrian while driving: they flee, car takes a bump.
    for (const ped of state.peds) {
      if (ped.alive && dist2(ped.x, ped.z, p.x, p.z) < 2.5 * 2.5) { ped.alive = false; state.wanted = Math.min(5, state.wanted + 1); state.pickups.push({ x: ped.x, z: ped.z, kind: 'cash', amount: 25, t: 0 }); }
    }
  } else {
    // On foot: WASD relative to camera.
    const fwd = { x: -Math.sin(state.camYaw), z: -Math.cos(state.camYaw) };
    const right = { x: -fwd.z, z: fwd.x };
    let mx = fwd.x * -ax.z + right.x * ax.x;
    let mz = fwd.z * -ax.z + right.z * ax.x;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      const target = Math.atan2(mx, mz);
      p.angle = angleLerp(p.angle, target, Math.min(1, dt * PLAYER.turn));
      moveCircle(p, mx * PLAYER.speed * dt, mz * PLAYER.speed * dt, state.cols, PLAYER.radius);
      p.speed = PLAYER.speed;
    } else p.speed = 0;
    clampToCity(p, CITY.half, 2);
    state.audio?.engine(0);
    // Enter a car.
    if (input.wasPressed('KeyE')) {
      const car = nearestCar(state, 4);
      if (car) {
        state.inCar = true; state.car = car; car.parked = false; car.ai = false;
        if (!car.playerOwned) {
          car.playerOwned = true;
          // Stealing a moving traffic car draws heat; a parked car does not.
          if (car.speed > 0.5) state.wanted = Math.min(5, state.wanted + 1);
        }
        // Re-entering your own car never adds wanted (playerOwned flag).
        state.camYaw = car.angle + Math.PI;
      }
    }
  }

  stepTraffic(state.cars, dt, state.cols, state.rng);
  stepPeds(state.peds, p, dt, state.cols, state.rng);
  stepPolice(state, dt, state.cols);
  stepCombat(state, input, dt);
  stepPickups(state, dt);
  stepMissions(state, input, dt);

  // Slow health regen on foot, out of trouble.
  if (state.wanted === 0 && p.hp > 0 && p.hp < PLAYER.hp) p.hp = Math.min(PLAYER.hp, p.hp + dt * 2);

  // Death: respawn at the hospital corner, keep mission, lose $100.
  if (p.hp <= 0) {
    p.hp = PLAYER.hp; p.x = 140; p.z = -140; p.angle = Math.PI;
    state.inCar = false; state.car = null; state.wanted = 0;
    state.cash = Math.max(0, state.cash - 100);
    state.flash = 'WASTED — you woke up at the hospital. -$100';
  }

  // Car-to-car bumps: push the player car away from traffic.
  if (state.inCar && state.car) {
    for (const c of state.cars) {
      if (c === state.car || c.exploded) continue;
      const d2 = dist2(c.x, c.z, state.car.x, state.car.z);
      if (d2 < 3.2 * 3.2) {
        const d = Math.sqrt(d2) || 0.01;
        const push = (3.2 - d) / 2;
        const nx = (state.car.x - c.x) / d, nz = (state.car.z - c.z) / d;
        state.car.x += nx * push; state.car.z += nz * push;
        state.car.speed *= 0.6;
      }
    }
  }

  // Adaptive quality: windowed latch — drop only if FPS stays low over a window,
  // and latch so it never flaps back up.
  state.frameT += dt;
  if (state.frameT >= 2) {
    const fps = 1 / Math.max(dt, 0.001);
    state.fps = fps;
    if (!state.qualityLatched && fps < 28) { state.lowT += 2; if (state.lowT >= 4) { state.quality = 'low'; state.qualityLatched = true; } }
    else state.lowT = 0;
    state.frameT = 0;
  }

  if (state.flash) { state.flashT -= dt; if (state.flashT <= 0) { state.flash = ''; state.flashT = 0; } }
}
