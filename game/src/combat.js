// Neon Harbor — combat: fists and the pistol.
// Hitscan shooting with a raycaster, muzzle flash and tracers by
// particles, car damage with smoke and explosions, and the player's
// health, reload and weapon switching.

import * as THREE from 'three';
import { PLAYER, CAR } from './config.js';

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

/** Create the combat state for the player. */
export function createCombat() {
  return {
    weapon: 'fists', // 'fists' | 'pistol'
    ammo: PLAYER.magazine,
    reloading: 0,
    cooldown: 0,
    lastShotAt: -10,
  };
}

/** Shoot the pistol from the camera through the crosshair. Returns a hit report. */
export function shootPistol(G, camera) {
  const combat = G.combat;
  if (combat.reloading > 0 || combat.cooldown > 0) return null;
  if (combat.ammo <= 0) {
    combat.reloading = PLAYER.reloadSeconds;
    G.audio.pickup();
    return { empty: true };
  }
  combat.ammo -= 1;
  combat.cooldown = 0.22;
  combat.lastShotAt = G.time;
  G.audio.gunshot();
  raycaster.setFromCamera(screenCenter, camera);
  raycaster.far = PLAYER.pistolRange;
  const targets = [];
  for (const ped of G.peds) {
    if (ped.state !== 'down') targets.push(ped.mesh);
  }
  for (const officer of G.officers) targets.push(officer.mesh);
  for (const car of G.cars) {
    if (!car.dead) targets.push(car.mesh);
  }
  for (const car of G.policeCars) {
    if (!car.dead) targets.push(car.mesh);
  }
  const hits = raycaster.intersectObjects(targets, true);
  // Muzzle flash at the camera, tracer sparks at the hit point.
  const muzzle = new THREE.Vector3();
  camera.getWorldPosition(muzzle);
  muzzle.addScaledVector(new THREE.Vector3(0, -0.3, 0), 1);
  G.effects.flashAt(muzzle, 14, 0xffe9a8);
  if (hits.length === 0) return { hit: false };
  const hit = hits[0];
  const point = hit.point;
  G.effects.burst(point, 0xffc860, 8, 5, 0.4);
  // Walk up the parents to find whose mesh was hit.
  let node = hit.object;
  while (node && node.parent && node.name !== 'person' && node.name !== 'car' && node.name !== 'policeCar') node = node.parent;
  if (!node) return { hit: true, point };
  // A pedestrian or an officer.
  const ped = G.peds.find((p) => p.mesh === node);
  if (ped) {
    ped.health -= PLAYER.pistolDamage;
    if (ped.health <= 0) {
      ped.state = 'down';
      ped.mesh.rotation.x = -Math.PI / 2;
      ped.mesh.position.y = 0.3;
      G.effects.burst(ped.pos, 0xd83a2e, 14, 4, 0.7);
      return { hit: true, point, killed: 'pedestrian', ped };
    }
    return { hit: true, point, hurt: 'pedestrian' };
  }
  const officer = G.officers.find((o) => o.mesh === node);
  if (officer) {
    // Officers are tough: three hits to drop one.
    officer.hits = (officer.hits || 0) + 1;
    if (officer.hits >= 3) {
      officer.down = true;
      officer.mesh.rotation.x = -Math.PI / 2;
      officer.mesh.position.y = 0.3;
      G.effects.burst(officer.pos, 0x2a4a8a, 14, 4, 0.7);
      return { hit: true, point, killed: 'officer', officer };
    }
    return { hit: true, point, hurt: 'officer' };
  }
  const car = G.cars.find((c) => c.mesh === node) || G.policeCars.find((c) => c.mesh === node);
  if (car) {
    car.health -= PLAYER.pistolDamage;
    G.effects.burst(point, 0x888888, 10, 6, 0.5);
    if (car.health <= 0 && !car.dead) {
      explodeCar(G, car);
      return { hit: true, point, killed: 'car', car };
    }
    return { hit: true, point, hurt: 'car' };
  }
  return { hit: true, point };
}

/** Blow a car up: light, debris, a shockwave of damage, and a wreck. */
export function explodeCar(G, car) {
  car.dead = true;
  const pos = car.pos.clone();
  pos.y = 1;
  G.effects.burst(pos, 0xff7a28, 46, 12, 1.1);
  G.effects.burst(pos, 0x333333, 30, 8, 1.6);
  G.effects.flashAt(pos, 60, 0xffa040);
  G.audio.explosion();
  G.shake = Math.max(G.shake, 0.7);
  // The blast hurts anyone close, including the player.
  const hurt = (p, radius, damage) => {
    const d = Math.hypot(p.x - pos.x, p.z - pos.z);
    if (d < radius) return damage * (1 - d / radius);
    return 0;
  };
  const playerDamage = hurt(G.player.pos, 10, 55);
  if (playerDamage > 0) damagePlayer(G, playerDamage);
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    if (hurt(ped.pos, 9, 100) > 60) {
      ped.state = 'down';
      ped.health = 0;
      ped.mesh.rotation.x = -Math.PI / 2;
      ped.mesh.position.y = 0.3;
    }
  }
  // The wreck stays, blackened and smoking.
  car.mesh.traverse((child) => {
    if (child.isMesh) child.material = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  });
  car.speed = 0;
}

/** Punch: a short-range swing that drops pedestrians in two hits. */
export function punch(G) {
  const combat = G.combat;
  if (combat.cooldown > 0) return null;
  combat.cooldown = 0.45;
  G.audio.punch();
  const reach = PLAYER.punchRange;
  const forward = new THREE.Vector3(Math.sin(G.player.heading), 0, Math.cos(G.player.heading));
  let best = null;
  let bestD = reach;
  const consider = (pos, target) => {
    const dx = pos.x - G.player.pos.x;
    const dz = pos.z - G.player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > reach) return;
    const dot = (dx * forward.x + dz * forward.z) / (d || 1);
    if (dot < 0.3) return;
    if (d < bestD) {
      bestD = d;
      best = target;
    }
  };
  for (const ped of G.peds) if (ped.state !== 'down') consider(ped.pos, { type: 'ped', ped });
  for (const officer of G.officers) if (!officer.down) consider(officer.pos, { type: 'officer', officer });
  if (!best) return { hit: false };
  G.effects.burst(G.player.pos.clone().addScaledVector(forward, 1.4).setY(1.2), 0xffffff, 6, 3, 0.3);
  if (best.type === 'ped') {
    best.ped.health -= PLAYER.punchDamage;
    if (best.ped.health <= 0) {
      best.ped.state = 'down';
      best.ped.mesh.rotation.x = -Math.PI / 2;
      best.ped.mesh.position.y = 0.3;
      return { hit: true, killed: 'pedestrian', ped: best.ped };
    }
    return { hit: true, hurt: 'pedestrian' };
  }
  best.officer.hits = (best.officer.hits || 0) + 1;
  if (best.officer.hits >= 3) {
    best.officer.down = true;
    best.officer.mesh.rotation.x = -Math.PI / 2;
    best.officer.mesh.position.y = 0.3;
    return { hit: true, killed: 'officer', officer: best.officer };
  }
  return { hit: true, hurt: 'officer' };
}

/** Hurt the player, with a short invulnerability window and a red flash. */
export function damagePlayer(G, amount) {
  const player = G.player;
  if (player.invulnerable > 0 || G.state !== 'playing') return;
  player.health -= amount;
  player.invulnerable = 0.6;
  G.damageFlash = 1;
  G.shake = Math.max(G.shake, 0.35);
  if (player.health <= 0) {
    player.health = 0;
    G.state = 'busted';
    G.audio.busted();
  }
}

/** Step the reload and cooldown timers. */
export function updateCombat(G, dt) {
  const combat = G.combat;
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  if (combat.reloading > 0) {
    combat.reloading -= dt;
    if (combat.reloading <= 0) {
      combat.ammo = PLAYER.magazine;
      combat.reloading = 0;
    }
  }
  // A smoking wreck keeps smoking a little.
  for (const car of G.cars) {
    if (car.dead && Math.random() < dt * 2) {
      const p = car.pos.clone();
      p.y = 1.6;
      G.effects.burst(p, 0x555555, 2, 1.2, 1.2);
    }
  }
}
