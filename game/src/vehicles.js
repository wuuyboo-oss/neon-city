// Neon Harbor — cars: the player's ride, street traffic and the police.
// One arcade model drives them all: speed, heading and steering, with
// circle colliders against buildings and each other. Traffic follows
// the road grid and turns at intersections; police chase the player.

import * as THREE from 'three';
import { CAR, PALETTE } from './config.js';
import { ROAD_COORDS, collideCircle } from './city.js';

const bodyGeo = new THREE.BoxGeometry(2, 0.85, 4.4);
const cabinGeo = new THREE.BoxGeometry(1.7, 0.75, 2.2);
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);

/** A low-poly car: body, cabin, four wheels, head- and taillights. */
export function makeCarMesh(color, isPolice) {
  const car = new THREE.Group();
  car.name = isPolice ? 'policeCar' : 'car';
  const paint = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, paint);
  body.position.y = 0.75;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshLambertMaterial({ color: 0x22303c }));
  cabin.position.set(0, 1.45, -0.2);
  cabin.castShadow = true;
  car.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    car.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), headMat);
    head.position.set(x, 0.8, 2.22);
    car.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xd83a2e });
  for (const x of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), tailMat);
    tail.position.set(x, 0.8, -2.22);
    car.add(tail);
  }
  if (isPolice) {
    const barRed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    barRed.position.set(-0.45, 1.95, -0.2);
    barRed.name = 'sirenRed';
    car.add(barRed);
    const barBlue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2a6aff }));
    barBlue.position.set(0.45, 1.95, -0.2);
    barBlue.name = 'sirenBlue';
    car.add(barBlue);
  }
  car.userData.wheels = wheels;
  return car;
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function randomRoadSpot() {
  const c = ROAD_COORDS[Math.floor(Math.random() * ROAD_COORDS.length)];
  const t = (Math.random() * 2 - 1) * 150;
  return Math.random() < 0.5 ? { x: c, z: t } : { x: t, z: c };
}

/** Create one car record. kind: 'player' | 'traffic' | 'police'. */
export function spawnCar(scene, kind, x, z, heading, color) {
  const isPolice = kind === 'police';
  const mesh = makeCarMesh(color ?? (isPolice ? PALETTE.policeWhite : PALETTE.carColors[Math.floor(Math.random() * PALETTE.carColors.length)]), isPolice);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  const car = {
    kind,
    mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    health: CAR.health,
    dead: false,
    // Traffic state: which road axis it follows and which way.
    axis: Math.random() < 0.5 ? 'x' : 'z',
    dir: Math.random() < 0.5 ? 1 : -1,
    targetSpeed: CAR.trafficSpeed * (0.8 + Math.random() * 0.4),
    sirenPhase: Math.random() * 10,
  };
  return car;
}

/** Step one traffic car along the road grid, turning at intersections. */
export function updateTrafficCar(car, dt, colliders, cars) {
  // Parked cars never move.
  if (car.targetSpeed === 0) {
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    return;
  }
  const along = car.axis === 'x' ? car.pos.x : car.pos.z;
  // Slow down for a car ahead on the same road.
  let want = car.targetSpeed;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const dx = other.pos.x - car.pos.x;
    const dz = other.pos.z - car.pos.z;
    const ahead = car.axis === 'x' ? dx * car.dir : dz * car.dir;
    const side = car.axis === 'x' ? Math.abs(dz) : Math.abs(dx);
    if (ahead > 0 && ahead < 9 && side < 3) want = 0;
  }
  car.speed += (want - car.speed) * Math.min(1, dt * 1.5);
  // At an intersection, sometimes turn onto the cross street.
  const nearCross = ROAD_COORDS.some((c) => Math.abs(along - c) < 1.2);
  if (nearCross && Math.random() < dt * 0.35) {
    car.axis = car.axis === 'x' ? 'z' : 'x';
    car.dir = Math.random() < 0.5 ? 1 : -1;
    // Snap onto the cross road's center line.
    if (car.axis === 'x') car.pos.z = ROAD_COORDS.reduce((a, b) => (Math.abs(b - car.pos.z) < Math.abs(a - car.pos.z) ? b : a));
    else car.pos.x = ROAD_COORDS.reduce((a, b) => (Math.abs(b - car.pos.x) < Math.abs(a - car.pos.x) ? b : a));
  }
  const targetHeading = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  car.heading = angleLerp(car.heading, targetHeading, Math.min(1, dt * 4));
  const lane = 3; // right-hand lane offset
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  car.pos.x += fx * car.speed * dt;
  car.pos.z += fz * car.speed * dt;
  // Keep the lane offset: nudge sideways toward the lane line.
  const rightX = Math.cos(car.heading) * lane;
  const rightZ = -Math.sin(car.heading) * lane;
  const roadLine = car.axis === 'x'
    ? ROAD_COORDS.reduce((a, b) => (Math.abs(b - car.pos.z) < Math.abs(a - car.pos.z) ? b : a))
    : ROAD_COORDS.reduce((a, b) => (Math.abs(b - car.pos.x) < Math.abs(a - car.pos.x) ? b : a));
  const wantX = car.axis === 'x' ? car.pos.x : roadLine + rightX;
  const wantZ = car.axis === 'x' ? roadLine + rightZ : car.pos.z;
  car.pos.x += (wantX - car.pos.x) * Math.min(1, dt * 2);
  car.pos.z += (wantZ - car.pos.z) * Math.min(1, dt * 2);
  // City bounds: turn around at the edge.
  if (Math.abs(car.pos.x) > 175 || Math.abs(car.pos.z) > 175) car.dir *= -1;
  collideCircle(car.pos, CAR.radius, colliders);
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += (car.speed * dt) / 0.42;
}

/** Step one police car: steer toward the target and ram it. */
export function updatePoliceCar(car, targetPos, dt, colliders) {
  const dx = targetPos.x - car.pos.x;
  const dz = targetPos.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  const wantHeading = Math.atan2(dx, dz);
  const turn = Math.max(-1, Math.min(1, ((wantHeading - car.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
  // Police turn at 1.4 rad/s — clumsier than the player's 1.9, as the
  // config promises — and top out at 15, half the player's 30, so a
  // fast driver builds distance on a straight and can lose them.
  // At 2.4 rad/s they turned better than the player and could never
  // be shaken, which made the escape steps nearly impossible.
  car.heading += turn * 1.4 * dt;
  const wantSpeed = dist > 6 ? CAR.policeSpeed : CAR.policeSpeed * 0.6;
  car.speed += (wantSpeed - car.speed) * Math.min(1, dt * 1.2);
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  collideCircle(car.pos, CAR.radius, colliders);
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += (car.speed * dt) / 0.42;
  // Flashing light bar.
  car.sirenPhase += dt * 6;
  const red = car.mesh.getObjectByName('sirenRed');
  const blue = car.mesh.getObjectByName('sirenBlue');
  if (red && blue) {
    const on = Math.sin(car.sirenPhase) > 0;
    red.material.color.setHex(on ? 0xff2a2a : 0x551111);
    blue.material.color.setHex(on ? 0x111155 : 0x2a6aff);
  }
  return dist;
}

/** Drive the player's car with arcade physics. Returns distance driven. */
export function drivePlayerCar(car, move, dt, colliders, cars) {
  const forward = move.forward;
  if (forward > 0) car.speed += CAR.accel * dt;
  else if (forward < 0) {
    car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  const steerInput = move.strafe;
  const steerFactor = Math.min(1, Math.abs(car.speed) / 8);
  // D turns right (heading grows toward +x), S reverses the steering.
  car.heading += steerInput * CAR.steerRate * steerFactor * Math.sign(car.speed || 1) * dt;
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  // Soft collision with other cars: push apart, lose a little speed.
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const dx = car.pos.x - other.pos.x;
    const dz = car.pos.z - other.pos.z;
    const d = Math.hypot(dx, dz);
    const min = CAR.radius * 2;
    if (d < min && d > 0.01) {
      const push = (min - d) / 2;
      car.pos.x += (dx / d) * push;
      car.pos.z += (dz / d) * push;
      car.speed *= 0.92;
    }
  }
  const push = collideCircle(car.pos, CAR.radius, colliders);
  if (push.x !== 0 || push.z !== 0) {
    // Scraped a building. How much of the push is against the car's
    // heading (driving into the wall) versus sideways along it?
    // Straight into the wall kills the speed; sliding along it only
    // scrubs a little, so a car pinned against a wall can slide free
    // instead of creeping at ~1 m/s until the police ram it apart.
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const pushLen = Math.hypot(push.x, push.z) || 1;
    const into = -(push.x * fx + push.z * fz) / pushLen;
    car.speed *= into > 0.5 ? 0.55 : 0.95;
  }
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += (car.speed * dt) / 0.42;
  return Math.abs(car.speed) * dt;
}

/** Scatter parked and traffic cars around the city. */
export function spawnStreetCars(scene, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const spot = randomRoadSpot();
    const heading = Math.random() * Math.PI * 2;
    const car = spawnCar(scene, 'traffic', spot.x, spot.z, heading);
    // Half of them parked at the curb, the rest driving.
    if (i % 2 === 0) {
      car.targetSpeed = 0;
      car.speed = 0;
    } else {
      car.speed = car.targetSpeed;
    }
    cars.push(car);
  }
  return cars;
}
