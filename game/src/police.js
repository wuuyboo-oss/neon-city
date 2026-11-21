// Police: wanted 0-5. Spawn BEHIND the player, chase and ram; give up when far away;
// wanted decays one star per `decay` seconds while no cop is within the quiet radius.
import { POLICE } from './config.js';
import { dist2, angleLerp, clamp } from './rng.js';
import { moveCircle } from './physics.js';

export function desiredPoliceCount(wanted) { return wanted > 0 ? Math.min(wanted, POLICE.count) : 0; }

export function spawnPolice(state, rng) {
  const p = state.player;
  // Behind the player: opposite their facing.
  const bx = p.x - Math.sin(p.angle) * 30, bz = p.z - Math.cos(p.angle) * 30;
  return {
    x: clamp(bx, -150, 150), z: clamp(bz, -150, 150),
    angle: Math.atan2(p.x - bx, p.z - bz), speed: 0, ramCd: 0, farT: 0,
  };
}

export function stepPolice(state, dt, cols) {
  const p = state.player;
  const want = desiredPoliceCount(state.wanted);
  while (state.police.length < want) state.police.push(spawnPolice(state, Math.random));
  while (state.police.length > want) state.police.pop();
  let nearest = Infinity;
  for (const c of state.police) {
    const d = Math.sqrt(dist2(c.x, c.z, p.x, p.z));
    nearest = Math.min(nearest, d);
    const target = Math.atan2(p.x - c.x, p.z - c.z);
    c.angle = angleLerp(c.angle, target, Math.min(1, POLICE.turn * dt));
    c.speed = d > 4 ? POLICE.speed : POLICE.speed * 0.5;
    const dx = Math.sin(c.angle) * c.speed * dt, dz = Math.cos(c.angle) * c.speed * dt;
    moveCircle(c, dx, dz, cols, 1.6);
    c.ramCd -= dt;
    if (d < 3.5 && c.ramCd <= 0) {
      c.ramCd = 1.0;
      if (state.inCar && state.car) { state.car.hp -= 5; if (state.car.hp <= 0) explodeCar(state, state.car); }
      else { state.player.hp -= POLICE.ramDamage; }
    }
    if (d > POLICE.giveUp) c.farT += dt; else c.farT = 0;
  }
  // Wanted decay: only while every cop is outside the quiet radius.
  if (state.wanted > 0 && nearest > POLICE.quietRadius) {
    state.quietT += dt;
    if (state.quietT >= POLICE.decay) { state.wanted -= 1; state.quietT = 0; }
  } else state.quietT = 0;
  state.nearestPolice = nearest;
}

export function explodeCar(state, car) {
  if (car.exploded) return;
  car.exploded = true; car.hp = 0;
  state.audio?.explosion();
  if (state.inCar && state.car === car) { state.inCar = false; state.car = null; state.player.hp -= 20; }
  state.pickups.push({ x: car.x + 2, z: car.z, kind: 'cash', amount: 100, t: 0 });
}
