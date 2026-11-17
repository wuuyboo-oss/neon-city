// Neon Harbor — particles, flashes and floating markers.
// Cheap pooled effects: explosion debris, muzzle flashes, skid smoke
// and the tall mission beacon the player follows across the city.

import * as THREE from 'three';

const PARTICLE_COUNT = 240;

/** A pool of small glowing boxes reused for every burst. */
export function createEffects(scene) {
  const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  scene.add(mesh);
  const parts = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    parts.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1, color: new THREE.Color(0xffffff), size: 1 });
  }
  const dummy = new THREE.Object3D();
  const flash = new THREE.PointLight(0xffc860, 0, 26, 1.6);
  scene.add(flash);

  return {
    /** A burst of debris: position, color, count, speed, life. */
    burst(pos, color, count, speed, life) {
      let made = 0;
      for (const p of parts) {
        if (made >= count) break;
        if (p.alive) continue;
        p.alive = true;
        p.pos.copy(pos);
        const a = Math.random() * Math.PI * 2;
        const up = Math.random() * 0.9 + 0.3;
        p.vel.set(Math.cos(a) * speed * (0.4 + Math.random() * 0.8), up * speed, Math.sin(a) * speed * (0.4 + Math.random() * 0.8));
        p.life = life * (0.6 + Math.random() * 0.7);
        p.maxLife = p.life;
        p.color.setHex(color);
        if (Math.random() < 0.4) p.color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.3);
        p.size = 0.6 + Math.random() * 1.2;
        made++;
      }
    },
    /** A short bright light at a position (muzzle flash, explosion). */
    flashAt(pos, intensity, color) {
      flash.position.copy(pos);
      flash.position.y += 1;
      flash.color.setHex(color || 0xffc860);
      flash.intensity = intensity;
    },
    update(dt) {
      let n = 0;
      for (const p of parts) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          continue;
        }
        p.vel.y -= 14 * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 0.15) {
          p.pos.y = 0.15;
          p.vel.y *= -0.35;
          p.vel.x *= 0.7;
          p.vel.z *= 0.7;
        }
        dummy.position.copy(p.pos);
        const s = p.size * (0.4 + 0.6 * (p.life / p.maxLife));
        dummy.scale.setScalar(s);
        dummy.rotation.set(p.life * 5, p.life * 7, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        mesh.setColorAt(n, p.color);
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      flash.intensity = Math.max(0, flash.intensity - dt * 30);
    },
  };
}

/** A tall glowing beacon marking the current mission objective. */
export function createBeacon(scene) {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 2.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30;
  group.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.28, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23a }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  group.add(ring);
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd23a }),
  );
  arrow.rotation.x = Math.PI;
  arrow.position.y = 8;
  group.add(arrow);
  group.visible = false;
  scene.add(group);
  return {
    group,
    set(pos, visible) {
      group.position.set(pos.x, 0, pos.z);
      group.visible = visible;
    },
    update(t) {
      if (!group.visible) return;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
      arrow.position.y = 8 + Math.sin(t * 2.4) * 1.2;
      beam.material.opacity = 0.38 + Math.sin(t * 3) * 0.08;
    },
  };
}
