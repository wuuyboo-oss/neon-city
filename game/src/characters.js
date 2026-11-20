// Neon Harbor — people on foot: the player, pedestrians and police.
// The player walks and runs in third person with a simple walk cycle;
// pedestrians stroll the sidewalks and flee from danger; police on
// foot run the player down and swing at them when they get close.

import * as THREE from 'three';
import { PLAYER, WORLD } from './config.js';
import { collideCircle } from './city.js';

const SKIN = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0];
const SHIRTS = [0xd83a2e, 0x2e6fd8, 0x30b06a, 0xf2c230, 0x7a4fd0, 0xe07a28, 0xe8e8e8, 0x30c0c0];
const PANTS = [0x2a3444, 0x4a3a2a, 0x333333, 0x5a6a7a];

/** A simple person: legs, torso, arms and a head, built to walk. */
export function makePersonMesh(shirt, pants, skin) {
  const person = new THREE.Group();
  person.name = 'person';
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  person.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skinMat);
  head.position.y = 1.78;
  head.castShadow = true;
  person.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.3), pantsMat);
  legL.position.set(-0.18, 0.38, 0);
  legL.name = 'legL';
  person.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.3), pantsMat);
  legR.position.set(0.18, 0.38, 0);
  legR.name = 'legR';
  person.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.24), shirtMat);
  armL.position.set(-0.48, 1.15, 0);
  armL.name = 'armL';
  person.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.24), shirtMat);
  armR.position.set(0.48, 1.15, 0);
  armR.name = 'armR';
  person.add(armR);
  person.userData.parts = { legL, legR, armL, armR };
  return person;
}

function swingWalk(mesh, phase, amount) {
  const p = mesh.userData.parts;
  if (!p) return;
  p.legL.rotation.x = Math.sin(phase) * amount;
  p.legR.rotation.x = -Math.sin(phase) * amount;
  p.armL.rotation.x = -Math.sin(phase) * amount * 0.7;
  p.armR.rotation.x = Math.sin(phase) * amount * 0.7;
}

/** The player on foot: WASD relative to the camera, Shift to run. */
export function createPlayer(scene, x, z) {
  const mesh = makePersonMesh(0x2e6fd8, 0x2a3444, SKIN[0]);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading: 0,
    speed: 0,
    vy: 0,
    onGround: true,
    walkPhase: 0,
    health: PLAYER.health,
    invulnerable: 0,
  };
}

export function updatePlayerOnFoot(player, move, cameraYaw, jump, dt, colliders) {
  const speed = move.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const f = move.forward;
  const s = move.strafe;
  const len = Math.hypot(f, s) || 1;
  const dirX = (Math.sin(cameraYaw) * (f / len) + Math.cos(cameraYaw) * (s / len));
  const dirZ = (Math.cos(cameraYaw) * (f / len) - Math.sin(cameraYaw) * (s / len));
  const targetSpeed = (f !== 0 || s !== 0) ? speed : 0;
  player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 10);
  player.pos.x += dirX * player.speed * dt;
  player.pos.z += dirZ * player.speed * dt;
  if (player.speed > 0.5) {
    player.heading = Math.atan2(dirX, dirZ);
    player.walkPhase += dt * player.speed * 1.6;
  }
  // Jump: a little hop, gravity brings the player back down.
  if (jump && player.onGround) {
    player.vy = PLAYER.jumpSpeed;
    player.onGround = false;
  }
  if (!player.onGround) {
    player.vy -= 22 * dt;
    player.pos.y += player.vy * dt;
    if (player.pos.y <= 0) {
      player.pos.y = 0;
      player.vy = 0;
      player.onGround = true;
    }
  }
  collideCircle(player.pos, PLAYER.radius, colliders);
  player.pos.x = Math.max(-WORLD.cityHalf, Math.min(WORLD.cityHalf, player.pos.x));
  player.pos.z = Math.max(-WORLD.cityHalf, Math.min(WORLD.waterStart - 4, player.pos.z));
  player.mesh.position.copy(player.pos);
  player.mesh.rotation.y = player.heading;
  swingWalk(player.mesh, player.walkPhase, 0.6);
}

/** Spawn pedestrians strolling the sidewalks. */
export function spawnPedestrians(scene, count, colliders) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const shirt = SHIRTS[Math.floor(Math.random() * SHIRTS.length)];
    const pants = PANTS[Math.floor(Math.random() * PANTS.length)];
    const skin = SKIN[Math.floor(Math.random() * SKIN.length)];
    const mesh = makePersonMesh(shirt, pants, skin);
    // Start on a sidewalk edge of a block (blocks sit 26 off the roads).
    const bx = (Math.floor(Math.random() * 6) - 3) * 52 + 26;
    const bz = (Math.floor(Math.random() * 6) - 3) * 52 + 26;
    const x = bx + (Math.random() < 0.5 ? -18 : 18);
    const z = bz + (Math.random() * 36 - 18);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh,
      pos: new THREE.Vector3(x, 0, z),
      heading: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 1.2,
      walkPhase: Math.random() * 6,
      state: 'walk', // walk | flee | down
      fleeTimer: 0,
      health: 100,
    });
  }
  return peds;
}

/** Step one pedestrian: stroll, or run from a threat. */
export function updatePedestrian(ped, dt, colliders, threatPos, threatNear) {
  if (ped.state === 'down') return;
  if (threatNear) {
    ped.state = 'flee';
    ped.fleeTimer = 2.5;
  }
  if (ped.state === 'flee') {
    ped.fleeTimer -= dt;
    if (ped.fleeTimer <= 0) ped.state = 'walk';
    const dx = ped.pos.x - threatPos.x;
    const dz = ped.pos.z - threatPos.z;
    const d = Math.hypot(dx, dz) || 1;
    ped.heading = Math.atan2(dx / d, dz / d);
    // Flee at 8 m/s: at 5.5 a car at 28 m/s closed the 14-unit warning
    // gap in 0.5 s and the ped (moving ~2.75 units) could not clear
    // the car's path, so every drive mowed down pedestrians and the
    // wanted level climbed from accidents alone. At 8 the ped clears
    // ~4 units in that time and gets out of the way.
    ped.pos.x += (dx / d) * 8 * dt;
    ped.pos.z += (dz / d) * 8 * dt;
    ped.walkPhase += dt * 9;
  } else {
    // Stroll: keep walking, turn at random, avoid buildings.
    if (Math.random() < dt * 0.15) ped.heading += (Math.random() - 0.5) * 1.6;
    ped.pos.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.pos.z += Math.cos(ped.heading) * ped.speed * dt;
    ped.walkPhase += dt * ped.speed * 2.2;
    if (Math.abs(ped.pos.x) > WORLD.cityHalf || Math.abs(ped.pos.z) > WORLD.cityHalf) {
      ped.heading += Math.PI;
    }
  }
  // Stay in the city either way: the stroll branch turns around at the
  // bounds, but a fleeing pedestrian would otherwise run straight out
  // of the map (and into the water) while escaping.
  ped.pos.x = Math.max(-WORLD.cityHalf, Math.min(WORLD.cityHalf, ped.pos.x));
  ped.pos.z = Math.max(-WORLD.cityHalf, Math.min(WORLD.waterStart - 4, ped.pos.z));
  collideCircle(ped.pos, 0.5, colliders);
  ped.mesh.position.copy(ped.pos);
  ped.mesh.rotation.y = ped.heading;
  swingWalk(ped.mesh, ped.walkPhase, 0.45);
}

/** A police officer on foot: navy shirt, cap, runs the player down. */
export function spawnPoliceOfficer(scene, x, z) {
  const mesh = makePersonMesh(0x1a2a4a, 0x1a1a22, SKIN[1]);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
  cap.position.y = 1.98;
  mesh.add(cap);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading: 0,
    speed: 0,
    walkPhase: 0,
    punchCooldown: 0,
  };
}

/** Step one officer: chase the player, punch when close. Returns damage dealt. */
export function updatePoliceOfficer(officer, playerPos, dt, colliders) {
  const dx = playerPos.x - officer.pos.x;
  const dz = playerPos.z - officer.pos.z;
  const d = Math.hypot(dx, dz);
  officer.punchCooldown -= dt;
  let damage = 0;
  if (d > 1.6) {
    officer.heading = Math.atan2(dx, dz);
    const speed = 7.5;
    officer.pos.x += Math.sin(officer.heading) * speed * dt;
    officer.pos.z += Math.cos(officer.heading) * speed * dt;
    officer.walkPhase += dt * 10;
  } else if (officer.punchCooldown <= 0) {
    officer.punchCooldown = 1.1;
    damage = 12;
    // Wind up the punch visibly.
    const arm = officer.mesh.userData.parts.armR;
    if (arm) arm.rotation.x = -1.6;
  }
  collideCircle(officer.pos, 0.5, colliders);
  officer.mesh.position.copy(officer.pos);
  officer.mesh.rotation.y = officer.heading;
  swingWalk(officer.mesh, officer.walkPhase, 0.55);
  return damage;
}
