// Procedural Neon Harbor: street grid, buildings, props. Fully original, no real-world city.
import { mulberry32, pick, range } from './rng.js';
import { CITY } from './config.js';

// Street centrelines at multiples of 40; block centres halfway between them.
export function streetLines() { const l = []; for (let v = -CITY.half; v <= CITY.half; v += CITY.street) l.push(v); return l; }
export function blockCenters() { const c = []; for (let v = -CITY.half + 20; v < CITY.half; v += CITY.street) c.push(v); return c; }
export function onRoad(x, z) {
  const rx = Math.abs(((x + 20) % 40 + 40) % 40 - 20), rz = Math.abs(((z + 20) % 40 + 40) % 40 - 20);
  return rx > 20 - CITY.roadW / 2 - 0.01 || rz > 20 - CITY.roadW / 2 - 0.01;
}

export function buildCity(seed = 1337) {
  const rng = mulberry32(seed);
  const buildings = [];
  const palette = [0x2b3a55, 0x3a2b4d, 0x274043, 0x4d2b3a, 0x333a2b, 0x40304a];
  const centers = blockCenters();
  // Chop-shop lot stays open at (120,100).
  for (const bx of centers) for (const bz of centers) {
    if (bx === 120 && bz === 100) continue;
    if (bx === -130 && bz === -100) { buildings.push({ x: -130, z: -100, w: 20, d: 28, h: 26, color: 0x5a2b3a, kind: 'hideout', neon: 0xff2d78 }); continue; }
    if (bx === -20 && bz === -20) { buildings.push({ x: -26, z: -26, w: 28, d: 28, h: 20, color: 0x8a7a3a, kind: 'bank', neon: 0xffd400 }); continue; }
    const w = range(rng, 16, 26), d = range(rng, 16, 26), h = range(rng, 10, 42);
    buildings.push({ x: bx + range(rng, -2, 2), z: bz + range(rng, -2, 2), w, d, h, color: pick(rng, palette), kind: 'tower', neon: pick(rng, [0xff2d78, 0x00e5ff, 0xffd400, 0x9b5cff]) });
  }
  // Street props: lamps along roads, a few neon signs.
  const lamps = [];
  for (const v of streetLines()) {
    for (let u = -140; u <= 140; u += 40) { lamps.push({ x: v + 6, z: u }); lamps.push({ x: u, z: v + 6 }); }
  }
  return { buildings, lamps, seed };
}

// Axis-aligned building colliders.
export function colliders(city) {
  return city.buildings.map(b => ({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 }));
}
