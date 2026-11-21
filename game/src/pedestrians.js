// Pedestrians: stroll the sidewalks, flee from the player (and from gunfire) when close.
import { mulberry32, pick, range, dist2, angleLerp } from './rng.js';
import { PED, CITY } from './config.js';
import { moveCircle, clampToCity } from './physics.js';

export function spawnPeds(rng, count = PED.count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    peds.push({
      x: range(rng, -140, 140), z: range(rng, -140, 140),
      angle: range(rng, 0, Math.PI * 2), speed: 0,
      color: pick(rng, [0xffb74d, 0x81c784, 0xe57373, 0xba68c8, 0xfff176]),
      state: 'walk', hp: 100, alive: true, panic: 0,
    });
  }
  return peds;
}

export function stepPeds(peds, player, dt, cols, rng) {
  for (const p of peds) {
    if (!p.alive) continue;
    const d2 = dist2(p.x, p.z, player.x, player.z);
    const threat = d2 < PED.threatRadius * PED.threatRadius || p.panic > 0;
    if (threat) {
      p.state = 'flee'; p.panic = Math.max(p.panic, 1.5);
      const away = Math.atan2(p.x - player.x, p.z - player.z);
      p.angle = angleLerp(p.angle, away, Math.min(1, dt * 6));
      p.speed = PED.fleeSpeed;
    } else {
      p.state = 'walk'; p.speed = PED.walkSpeed;
      if (rng() < dt * 0.15) p.angle = range(rng, 0, Math.PI * 2);
    }
    p.panic = Math.max(0, p.panic - dt);
    const dx = Math.sin(p.angle) * p.speed * dt, dz = Math.cos(p.angle) * p.speed * dt;
    moveCircle(p, dx, dz, cols, 0.6);
    clampToCity(p, CITY.half, 4);
  }
}
