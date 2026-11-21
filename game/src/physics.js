// Movement + collision. Circle vs building AABBs, axis-separated so the player
// and cars slide along walls instead of sticking.
import { clamp } from './rng.js';

export function moveCircle(pos, dx, dz, cols, radius) {
  const nx = pos.x + dx;
  let hitX = false;
  for (const c of cols) {
    if (nx + radius > c.minX && nx - radius < c.maxX && pos.z + radius > c.minZ && pos.z - radius < c.maxZ) { hitX = true; break; }
  }
  if (!hitX) pos.x = nx;
  const nz = pos.z + dz;
  let hitZ = false;
  for (const c of cols) {
    if (pos.x + radius > c.minX && pos.x - radius < c.maxX && nz + radius > c.minZ && nz - radius < c.maxZ) { hitZ = true; break; }
  }
  if (!hitZ) pos.z = nz;
  return hitX || hitZ;
}

export function clampToCity(pos, half, margin = 2) {
  pos.x = clamp(pos.x, -half + margin, half - margin);
  pos.z = clamp(pos.z, -half + margin, half - margin);
}

// Simple arcade car physics: accelerate, steer (stronger at speed), drag, brake.
export function stepCar(car, input, dt, cols) {
  const ax = input.axis();
  const forward = ax.z < 0 ? 1 : ax.z > 0 ? -1 : 0; // W = forward
  if (forward !== 0) car.speed += forward * 14 * dt;
  else car.speed -= Math.sign(car.speed) * 6 * dt;
  if (Math.abs(car.speed) < 0.05 && forward === 0) car.speed = 0;
  if (input.down('Space')) car.speed -= Math.sign(car.speed) * 22 * dt;
  car.speed = clamp(car.speed, -8, 24);
  const steer = ax.x * 1.9 * clamp(Math.abs(car.speed) / 8, 0, 1) * Math.sign(car.speed || 1);
  car.angle += steer * dt;
  const dx = Math.sin(car.angle) * car.speed * dt;
  const dz = Math.cos(car.angle) * car.speed * dt;
  moveCircle(car, dx, dz, cols, 1.6);
  return Math.abs(car.speed);
}
