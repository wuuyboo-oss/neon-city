// Traffic AI: cars drive the street grid, turning at intersections, avoiding the player car.
import { mulberry32, pick, range, clamp } from './rng.js';
import { CITY } from './config.js';
import { moveCircle } from './physics.js';

const CAR_COLORS = [0xc0c8d8, 0x8a2f2f, 0x2f6a8a, 0xd8b13c, 0x3c8a4d, 0x777777, 0x9b5cff];

export function spawnTraffic(rng, cols, count = 10) {
  const cars = [];
  const lines = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.street) lines.push(v);
  for (let i = 0; i < count; i++) {
    const along = pick(rng, lines), across = range(rng, -140, 140);
    const vertical = rng() < 0.5;
    const lane = (rng() < 0.5 ? -3 : 3);
    const car = {
      x: vertical ? along + lane : across, z: vertical ? across : along + lane,
      angle: vertical ? (lane < 0 ? 0 : Math.PI) : (lane < 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: range(rng, 7, 10), color: pick(rng, CAR_COLORS),
      parked: false, playerOwned: false, ai: true, hp: 100, vertical,
    };
    cars.push(car);
  }
  // Parked cars along streets for the player to steal.
  const parkedSpots = [[8, -40], [-8, 40], [48, -8], [-48, 8], [88, 32], [-88, -32], [8, 120], [-8, -120]];
  for (const [x, z] of parkedSpots) {
    cars.push({ x, z, angle: range(rng, 0, Math.PI * 2), speed: 0, color: pick(rng, CAR_COLORS), parked: true, playerOwned: false, ai: false, hp: 100, vertical: false });
  }
  return cars;
}

function nearIntersection(v) { const m = ((v % 40) + 40) % 40; return Math.min(m, 40 - m) < 3; }

export function stepTraffic(cars, dt, cols, rng) {
  for (const c of cars) {
    if (!c.ai || c.speed === 0) continue;
    // Slow for a car directly ahead.
    let blocked = false;
    for (const o of cars) {
      if (o === c || o.speed === 0 && o.parked) continue;
      const dx = o.x - c.x, dz = o.z - c.z;
      const ahead = dx * Math.sin(c.angle) + dz * Math.cos(c.angle);
      const side = Math.abs(dx * Math.cos(c.angle) - dz * Math.sin(c.angle));
      if (ahead > 0 && ahead < 8 && side < 2.5) { blocked = true; break; }
    }
    const target = blocked ? 0 : 9;
    c.speed += clamp(target - c.speed, -10 * dt, 6 * dt);
    if (nearIntersection(c.x) && nearIntersection(c.z) && rng() < dt * 0.8) {
      // Turn at an intersection.
      c.vertical = !c.vertical;
      c.angle = c.vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    }
    const dx = Math.sin(c.angle) * c.speed * dt, dz = Math.cos(c.angle) * c.speed * dt;
    moveCircle(c, dx, dz, cols, 1.6);
    c.x = clamp(c.x, -CITY.half + 2, CITY.half - 2);
    c.z = clamp(c.z, -CITY.half + 2, CITY.half - 2);
  }
}
