// three.js renderer: ground, roads, neon buildings, cars, people, cops, markers.
import * as THREE from '../vendor/three.module.min.js';
import { PALETTE } from './config.js';
import { missionTarget } from './missions.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);
  // No shadow maps: they cost a fortune under software rendering and the neon look
  // reads fine with hemisphere + directional light alone.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 90, 260);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
  scene.add(new THREE.HemisphereLight(0x8a7bff, 0x0a0a12, 0.9));
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.1);
  sun.position.set(60, 120, 40);
  scene.add(sun);
  return { renderer, scene, camera, sun };
}

function box(w, h, d, color, emissive = 0x000000) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, emissive }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function buildScene(R, state) {
  const { scene } = R;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), new THREE.MeshLambertMaterial({ color: PALETTE.ground }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // Roads: dark strips on both axes.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  for (let v = -160; v <= 160; v += 40) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(340, 10), roadMat);
    a.rotation.x = -Math.PI / 2; a.position.set(0, 0.02, v); scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(10, 340), roadMat);
    b.rotation.x = -Math.PI / 2; b.position.set(v, 0.02, 0); scene.add(b);
  }
  // Buildings with neon roof strips.
  for (const b of state.city.buildings) {
    const m = box(b.w, b.h, b.d, b.color);
    m.position.set(b.x, b.h / 2, b.z); scene.add(m);
    const strip = box(b.w * 0.9, 0.5, 0.6, b.neon, b.neon);
    strip.position.set(b.x, b.h + 0.3, b.z - b.d / 2 + 0.4); scene.add(strip);
    const win = box(b.w * 0.7, b.h * 0.6, 0.1, 0x11131c, 0x223044);
    win.position.set(b.x, b.h * 0.55, b.z - b.d / 2 - 0.06); scene.add(win);
  }
  // Lamps.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x333333, emissive: 0xffd400 });
  for (const l of state.city.lamps.slice(0, 120)) {
    const pole = box(0.3, 5, 0.3, 0x222222); pole.position.set(l.x, 2.5, l.z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lampMat);
    head.position.set(l.x, 5.2, l.z); scene.add(head);
  }
  // Player.
  const player = new THREE.Group();
  const body = box(1.1, 1.7, 0.6, 0x00e5ff, 0x004455); body.position.y = 1.1; player.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffd9b0 }));
  head.position.y = 2.3; head.castShadow = true; player.add(head);
  scene.add(player);
  // Cars: one mesh group per car, reused.
  const carGroups = state.cars.map(c => {
    const g = new THREE.Group();
    const bodyM = box(2.2, 0.8, 4.4, c.color); bodyM.position.y = 0.6; g.add(bodyM);
    const cab = box(1.9, 0.7, 2.2, 0x11131c); cab.position.set(0, 1.3, -0.3); g.add(cab);
    const light = box(2.0, 0.25, 0.3, 0xffffff, 0xffffff); light.position.set(0, 0.7, 2.2); g.add(light);
    scene.add(g); return g;
  });
  // Police cars.
  const copGroups = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const bodyM = box(2.2, 0.8, 4.4, 0x1a2a66); bodyM.position.y = 0.6; g.add(bodyM);
    const cab = box(1.9, 0.7, 2.2, 0x11131c); cab.position.set(0, 1.3, -0.3); g.add(cab);
    const bar = box(1.4, 0.3, 0.5, 0xff0000, 0xff0000); bar.position.set(0, 1.8, -0.3); g.add(bar);
    g.visible = false; scene.add(g); copGroups.push(g);
  }
  // Pedestrians.
  const pedGroups = state.peds.map(p => {
    const g = new THREE.Group();
    const b = box(0.7, 1.5, 0.5, p.color); b.position.y = 0.9; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffd9b0 }));
    h.position.y = 1.9; g.add(h); scene.add(g); return g;
  });
  // Cash pickups: spinning gold boxes.
  const pickupGroups = state.pickups.map(() => {
    const g = box(0.9, 0.9, 0.3, 0xffd400, 0xaa8800); g.position.y = 1; scene.add(g); return g;
  });
  // Mission marker: tall glowing beacon.
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2d78, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  marker.position.y = 15; scene.add(marker);
  const markerRing = new THREE.Mesh(new THREE.RingGeometry(2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xff2d78, side: THREE.DoubleSide }));
  markerRing.rotation.x = -Math.PI / 2; markerRing.position.y = 0.1; scene.add(markerRing);
  return { player, carGroups, copGroups, pedGroups, pickupGroups, marker, markerRing };
}

export function renderFrame(R, S, state, w, h) {
  const { renderer, scene, camera } = R;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (state.quality === 'low') renderer.setPixelRatio(1);
  else renderer.setPixelRatio(1);
  const p = state.player;
  const fwd = { x: -Math.sin(state.camYaw), z: -Math.cos(state.camYaw) };
  const dist = state.inCar ? 13 : 10, height = state.inCar ? 6.5 : 5.5;
  camera.position.set(p.x - fwd.x * dist, height, p.z - fwd.z * dist);
  camera.lookAt(p.x + fwd.x * 4, 1.5, p.z + fwd.z * 4);
  // Player mesh.
  S.player.visible = !state.inCar;
  S.player.position.set(p.x, 0, p.z);
  S.player.rotation.y = p.angle;
  // Cars.
  state.cars.forEach((c, i) => {
    const g = S.carGroups[i]; if (!g) return;
    g.visible = !c.exploded;
    g.position.set(c.x, 0, c.z); g.rotation.y = c.angle;
  });
  // Police.
  S.copGroups.forEach((g, i) => {
    const c = state.police[i];
    g.visible = !!c;
    if (c) {
      g.position.set(c.x, 0, c.z); g.rotation.y = c.angle;
      const bar = g.children[2];
      bar.material.emissive.setHex((Math.floor(state.time * 6) % 2 === 0) ? 0xff0000 : 0x0000ff);
    }
  });
  // Peds.
  state.peds.forEach((pd, i) => {
    const g = S.pedGroups[i]; if (!g) return;
    g.visible = pd.alive;
    g.position.set(pd.x, 0, pd.z); g.rotation.y = pd.angle;
  });
  // Pickups (spin, hide taken).
  state.pickups.forEach((pk, i) => {
    const g = S.pickupGroups[i]; if (!g) return;
    g.visible = !pk.taken;
    g.position.set(pk.x, 1 + Math.sin(state.time * 3 + i) * 0.2, pk.z);
    g.rotation.y = state.time * 2 + i;
  });
  // Mission marker.
  const t = missionTarget(state);
  S.marker.position.set(t.x, 15, t.z);
  S.marker.material.color.setHex(t.color);
  S.markerRing.position.set(t.x, 0.1, t.z);
  S.markerRing.material.color.setHex(t.color);
  S.marker.visible = !state.won; S.markerRing.visible = !state.won;
  renderer.render(scene, camera);
}
