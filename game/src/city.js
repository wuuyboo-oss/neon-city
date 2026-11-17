// Neon Harbor — the city itself.
// A procedural sun-soaked harbor city: a 7x7 grid of pastel blocks,
// roads with dashed center lines, sidewalks, palms, street lamps,
// a plaza with a fountain, the harbor water with docks, boats and
// crates, plus the bank, the hospital and the hideout. Every building
// also registers an axis-aligned collider the cars and the player use.

import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { mulberry32, pick, range, rangeInt } from './rng.js';

/** The road center lines, in world units, on both axes. */
export const ROAD_COORDS = [-156, -104, -52, 0, 52, 104, 156];

/** A canvas texture of lit and dark windows on a white wall. */
function makeWindowTexture(random, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 256);
  const cols = 4;
  const rows = 8;
  const w = 128 / cols;
  const h = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = random() < litRatio ? '#ffd98a' : '#3a4a5a';
      ctx.fillRect(c * w + 5, r * h + 7, w - 10, h - 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** A canvas texture with gold letters on a dark plate. */
function makeSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1d2a44';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#d8b25a';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = '#f2d06a';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Push a circle (x, z, radius) out of every building collider it overlaps. */
export function collideCircle(pos, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        // Center inside the box: push out along the smallest penetration.
        const pushLeft = pos.x - c.minX;
        const pushRight = c.maxX - pos.x;
        const pushBack = pos.z - c.minZ;
        const pushFront = c.maxZ - pos.z;
        const m = Math.min(pushLeft, pushRight, pushBack, pushFront);
        if (m === pushLeft) pos.x = c.minX - radius;
        else if (m === pushRight) pos.x = c.maxX + radius;
        else if (m === pushBack) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
  }
}

/** Whether a point lies inside any building collider. */
export function pointInBuilding(x, z, colliders) {
  for (const c of colliders) {
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) return true;
  }
  return false;
}

/** Build the whole city into the scene. Returns colliders and landmarks. */
export function buildCity(scene, seed) {
  const random = mulberry32(seed);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  // --- lights: a warm low sun and a soft sky fill -------------------------
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ee, 0x8a7a5f, 1.1));

  // --- ground, water and sand ---------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(760, WORLD.waterEnd - WORLD.waterStart + 40),
    new THREE.MeshPhongMaterial({ color: PALETTE.water, shininess: 120, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.15, (WORLD.waterStart + WORLD.waterEnd) / 2);
  group.add(water);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 18),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.06, WORLD.waterStart - 9);
  sand.receiveShadow = true;
  group.add(sand);

  // --- roads: plain asphalt, with a dashed center line -----------------------
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3d42 });
  for (const c of ROAD_COORDS) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, 380), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0.02, 0);
    ns.receiveShadow = true;
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(380, WORLD.roadWidth), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.02, c);
    ew.receiveShadow = true;
    group.add(ew);
  }
  // One instanced mesh for every center-line dash in the city.
  const dashGeo = new THREE.BoxGeometry(0.35, 0.05, 4);
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashPositions = [];
  for (const c of ROAD_COORDS) {
    for (let t = -175; t <= 175; t += 9) {
      dashPositions.push({ x: c, z: t, rot: 0 });
      dashPositions.push({ x: t, z: c, rot: Math.PI / 2 });
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashPositions.length);
  {
    const dummy = new THREE.Object3D();
    dashPositions.forEach((d, i) => {
      dummy.position.set(d.x, 0.05, d.z);
      dummy.rotation.set(0, d.rot, 0);
      dummy.updateMatrix();
      dashes.setMatrixAt(i, dummy.matrix);
    });
  }
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);

  // --- building materials ---------------------------------------------------
  const windowTex = [makeWindowTexture(random, 0.25), makeWindowTexture(random, 0.4), makeWindowTexture(random, 0.15)];
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4440 });
  const wallMats = [];
  for (const color of PALETTE.buildings) {
    for (const tex of windowTex) {
      wallMats.push(new THREE.MeshLambertMaterial({ color, map: tex }));
    }
  }
  const wallMat = () => pick(random, wallMats);

  function addBuilding(cx, cz, w, d, h, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    return mesh;
  }

  // --- blocks: two buildings per block, taller near the middle --------------
  // Block centers sit midway between the roads (26 off each road line),
  // so no building ever touches a road: a block spans 40 units inside
  // a 52-unit gap, leaving the road and its sidewalk clear.
  const isSpecial = (cx, cz) =>
    (cx === 26 && cz === 26) || (cx === -26 && cz === -26) || (cx === 130 && cz === 130) || (cx === -130 && cz === -130);
  for (let bx = -3; bx <= 2; bx++) {
    for (let bz = -3; bz <= 2; bz++) {
      const cx = bx * WORLD.roadPitch + 26;
      const cz = bz * WORLD.roadPitch + 26;
      if (isSpecial(cx, cz)) continue;
      // Sidewalk slab for the block.
      const walk = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.blockSize, WORLD.blockSize),
        new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk }),
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.01, cz);
      walk.receiveShadow = true;
      group.add(walk);
      const distCenter = Math.abs(bx) + Math.abs(bz);
      const maxH = distCenter <= 2 ? 34 : distCenter <= 4 ? 22 : 14;
      const vertical = random() < 0.5;
      if (vertical) {
        addBuilding(cx - 9, cz, 16, 34, range(random, 8, maxH), wallMat());
        addBuilding(cx + 9, cz, 16, 34, range(random, 8, maxH), wallMat());
      } else {
        addBuilding(cx, cz - 9, 34, 16, range(random, 8, maxH), wallMat());
        addBuilding(cx, cz + 9, 34, 16, range(random, 8, maxH), wallMat());
      }
    }
  }

  // --- plaza (26,26): open square with a fountain and palms ------------------
  const plazaWalk = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.blockSize, WORLD.blockSize),
    new THREE.MeshLambertMaterial({ color: 0xc8bfa8 }),
  );
  plazaWalk.rotation.x = -Math.PI / 2;
  plazaWalk.position.set(26, 0.01, 26);
  plazaWalk.receiveShadow = true;
  group.add(plazaWalk);
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 7, 1.2, 20),
    new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }),
  );
  fountainBase.position.set(26, 0.6, 26);
  fountainBase.castShadow = true;
  group.add(fountainBase);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 0.3, 20),
    new THREE.MeshPhongMaterial({ color: 0x3a9ac8, shininess: 140 }),
  );
  fountainWater.position.set(26, 1.2, 26);
  group.add(fountainWater);

  // --- bank (-26,-26): a wide low hall with columns and a gold sign --------
  const bankMat = new THREE.MeshLambertMaterial({ color: 0xe8ddc0, map: windowTex[0] });
  addBuilding(-26, -26, 30, 20, 12, bankMat);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 3.4),
    new THREE.MeshBasicMaterial({ map: makeSignTexture('HARBOR BANK') }),
  );
  // On the north face, facing the street (and the camera).
  sign.position.set(-26, 10.5, -36.1);
  sign.rotation.y = Math.PI;
  group.add(sign);
  for (const ox of [-10, -3.4, 3.4, 10]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xf5efe0 }),
    );
    col.position.set(-26 + ox, 5, -38);
    col.castShadow = true;
    group.add(col);
  }

  // --- hospital (130,130): white tower with a red cross ----------------------
  const hospMat = new THREE.MeshLambertMaterial({ color: 0xf2f2ee, map: windowTex[1] });
  addBuilding(130, 130, 26, 26, 26, hospMat);
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xd83a2e });
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5, 0.6), crossMat);
  crossV.position.set(130, 28.5, 116.8);
  group.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 0.6), crossMat);
  crossH.position.set(130, 28.5, 116.8);
  group.add(crossH);

  // --- hideout (-130,-130): a small two-storey house -------------------------
  addBuilding(-130, -130, 14, 12, 9, new THREE.MeshLambertMaterial({ color: 0xf2d8b3, map: windowTex[2] }));

  // --- docks: piers, crates, containers and boats ---------------------------
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb08a3a });
  const containerColors = [0xd83a2e, 0x2e6fd8, 0x30b06a, 0xf2c230];
  for (const px of [-52, 26, 104]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 46), woodMat);
    pier.position.set(px, 0.6, WORLD.waterStart + 18);
    pier.castShadow = true;
    pier.receiveShadow = true;
    group.add(pier);
  }
  for (let i = 0; i < 14; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), i % 3 === 0 ? crateMat : new THREE.MeshLambertMaterial({ color: pick(random, containerColors) }));
    crate.position.set(range(random, -160, 160), 1.5 + (i % 2) * 3, range(random, 182, 194));
    crate.rotation.y = random() * Math.PI;
    crate.castShadow = true;
    group.add(crate);
  }
  function addBoat(x, z, color) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 16), new THREE.MeshLambertMaterial({ color }));
    hull.position.set(x, 0.8, z);
    hull.castShadow = true;
    group.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0xf0f0e8 }));
    cabin.position.set(x, 2.8, z - 2);
    group.add(cabin);
  }
  addBoat(-80, 240, 0xe8e8e8);
  addBoat(40, 260, 0xd83a2e);
  addBoat(140, 230, 0x2e6fd8);

  // --- palms and street lamps -------------------------------------------------
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3a8a4a });
  const palmSpots = [];
  for (let i = 0; i < 48; i++) {
    const bx = rangeInt(random, -3, 2) * WORLD.roadPitch + 26;
    const bz = rangeInt(random, -3, 2) * WORLD.roadPitch + 26;
    palmSpots.push({ x: bx + pick(random, [-18, 18]), z: bz + range(random, -18, 18) });
  }
  for (const p of palmSpots) {
    if (pointInBuilding(p.x, p.z, colliders)) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.set(p.x, 3.5, p.z);
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 0), frondMat);
    crown.scale.set(1, 0.45, 1);
    crown.position.set(p.x, 7.4, p.z);
    crown.castShadow = true;
    group.add(crown);
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const c of ROAD_COORDS) {
    for (let t = -150; t <= 150; t += 52) {
      for (const [x, z] of [[c + 7, t], [t, c + 7]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
        pole.position.set(x, 3, z);
        group.add(pole);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
        head.position.set(x, 6.1, z);
        group.add(head);
      }
    }
  }

  return { colliders, group, sun };
}
