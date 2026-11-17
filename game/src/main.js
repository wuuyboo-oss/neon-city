// Neon Harbor — boot, the game loop and the state machine.
// Title → playing → paused / busted. The loop drives the player
// (on foot or in a car), traffic, pedestrians, police, missions,
// the wanted level, combat, the HUD and the camera. Shot mode
// (?shot=start|street|chase|mission) stages a scene for screenshots
// and sets window.__shotReady when it is painted.

import * as THREE from 'three';
import { WORLD, PLAYER, CAR, WANTED, MISSIONS } from './config.js';
import { buildCity, pointInBuilding } from './city.js';
import { createPlayer, updatePlayerOnFoot, spawnPedestrians, updatePedestrian, spawnPoliceOfficer, updatePoliceOfficer } from './characters.js';
import { spawnCar, spawnStreetCars, updateTrafficCar, updatePoliceCar, drivePlayerCar } from './vehicles.js';
import { createCombat, shootPistol, punch, updateCombat, damagePlayer, explodeCar } from './combat.js';
import { createWanted, commitCrime, updateWanted, wantedPoliceCount } from './wanted.js';
import { createMissions, currentMission, currentStep, updateMissions, spawnCashPickups, MISSION_DEFS } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_INTERACT, ACTION_ATTACK, ACTION_WEAPON, ACTION_RELOAD, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createEffects, createBeacon } from './effects.js';
import { loadSave, writeSave, clearSave } from './save.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// --- renderer, scene, camera -------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9e8);
scene.fog = new THREE.Fog(0xa8c8dc, 220, 620);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- the game state ------------------------------------------------------------
const G = {
  scene,
  camera,
  time: 0,
  state: 'title', // title | playing | paused | busted
  cash: 0,
  shake: 0,
  damageFlash: 0,
  driving: false,
  playerCar: null,
  missionStep: null,
  colliders: [],
  cars: [],
  policeCars: [],
  officers: [],
  peds: [],
  pickups: [],
  cameraYaw: Math.PI,
  cameraPitch: 0.32,
  cameraDist: 8,
  saveTimer: 0,
};

const city = buildCity(scene, seed);
G.colliders = city.colliders;
G.sun = city.sun;
G.player = createPlayer(scene, WORLD.plaza.x, WORLD.plaza.z + 6);
G.cars = spawnStreetCars(scene, 16);
G.peds = spawnPedestrians(scene, 24, G.colliders);
G.combat = createCombat();
G.wanted = createWanted();
G.missions = createMissions();
G.effects = createEffects(scene);
G.beacon = createBeacon(scene);
G.audio = createAudio();
G.hud = createHud(city);
G.input = createInput(canvas);
G.pickups = spawnCashPickups(scene, THREE);
window.__game = G;

function announce(message) {
  status.textContent = message;
}

// --- screens -------------------------------------------------------------------
const screenTitle = document.getElementById('screen-title');
const screenPause = document.getElementById('screen-pause');
const screenDead = document.getElementById('screen-dead');
const btnStart = document.getElementById('btn-start');
const btnContinue = document.getElementById('btn-continue');
const btnResume = document.getElementById('btn-resume');
const btnQuitTitle = document.getElementById('btn-quit-title');
const btnRespawn = document.getElementById('btn-respawn');
const btnRestart = document.getElementById('btn-restart');

function showOnly(screen) {
  screenTitle.style.display = screen === 'title' ? 'flex' : 'none';
  screenPause.style.display = screen === 'paused' ? 'flex' : 'none';
  screenDead.style.display = screen === 'busted' ? 'flex' : 'none';
  // The HUD (and its toast) belong to gameplay, not to the title screen.
  document.getElementById('hud').style.display = screen === 'title' ? 'none' : 'block';
  document.getElementById('toast').style.display = screen === 'title' ? 'none' : 'block';
}

function saveGame() {
  writeSave({
    cash: G.cash,
    missionIndex: G.missions.index,
    storyDone: G.missions.done,
    x: G.player.pos.x,
    z: G.player.pos.z,
    health: Math.max(1, Math.round(G.player.health)),
  });
}

function applySave(save) {
  G.cash = save.cash;
  G.missions.index = Math.min(save.missionIndex, MISSION_DEFS.length - 1);
  G.missions.done = save.storyDone;
  G.player.pos.set(save.x, 0, save.z);
  G.player.mesh.position.copy(G.player.pos);
  G.player.health = save.health;
}

function startGame(fresh) {
  if (fresh) {
    clearSave();
    G.cash = 0;
    G.missions = createMissions();
    G.wanted = createWanted();
    G.player.health = PLAYER.health;
    G.player.pos.set(WORLD.plaza.x, 0, WORLD.plaza.z + 6);
    G.player.mesh.position.copy(G.player.pos);
  } else {
    const save = loadSave();
    if (save) applySave(save);
  }
  G.state = 'playing';
  showOnly(null);
  G.audio.unlock();
  if (!G.missions.started && !G.missions.done) {
    const mission = currentMission(G.missions);
    if (mission) G.hud.showBanner(mission.title, mission.intro);
  }
  announce('Playing Neon Harbor.');
}

btnStart.addEventListener('click', () => startGame(true));
btnContinue.addEventListener('click', () => startGame(false));
btnResume.addEventListener('click', () => {
  G.state = 'playing';
  showOnly(null);
});
btnQuitTitle.addEventListener('click', () => {
  saveGame();
  G.state = 'title';
  showOnly('title');
  refreshTitleButtons();
});
btnRespawn.addEventListener('click', () => {
  G.cash = Math.max(0, G.cash - 200);
  G.wanted = createWanted();
  G.player.health = PLAYER.health;
  G.player.pos.set(WORLD.hospital.x, 0, WORLD.hospital.z);
  G.player.mesh.position.copy(G.player.pos);
  G.state = 'playing';
  showOnly(null);
  G.hud.toast('You woke up at Harbor General. -$200 hospital bill.');
});
btnRestart.addEventListener('click', () => {
  clearSave();
  window.location.search = '';
});

function refreshTitleButtons() {
  const save = loadSave();
  btnContinue.style.display = save ? 'inline-block' : 'none';
  document.getElementById('save-note').textContent = save
    ? `Saved game found: $${save.cash.toLocaleString('en-US')}, job ${Math.min(save.missionIndex + 1, 3)} of 3.`
    : 'No saved game yet — start a new life in Neon Harbor.';
}
refreshTitleButtons();

// --- entering and leaving cars ---------------------------------------------------
function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.dead || car.kind === 'player') continue;
    const d = Math.hypot(car.pos.x - G.player.pos.x, car.pos.z - G.player.pos.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterCar(car) {
  G.driving = true;
  G.playerCar = car;
  car.kind = 'player';
  car.targetSpeed = 0;
  G.player.mesh.visible = false;
  G.player.pos.copy(car.pos);
  G.audio.engine(0, true);
  if (car.wasTraffic) commitCrime(G, WANTED.stealCar);
  G.hud.toast('You are driving. W/S to drive, A/D to steer.');
}

function exitCar() {
  const car = G.playerCar;
  if (!car) return;
  car.kind = 'traffic';
  car.wasTraffic = true;
  car.targetSpeed = 0;
  car.speed = 0;
  G.driving = false;
  G.playerCar = null;
  const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
  G.player.pos.copy(car.pos).addScaledVector(side, 3);
  G.player.pos.y = 0;
  G.player.mesh.visible = true;
  G.player.mesh.position.copy(G.player.pos);
  G.audio.engine(0, false);
}

// Mark the street cars as stealable traffic from the start.
for (const car of G.cars) car.wasTraffic = true;

// --- police management -----------------------------------------------------------
function managePolice(dt) {
  const want = wantedPoliceCount(G.wanted.level);
  // Spawn more police cars when the heat calls for them.
  if (G.policeCars.length < want) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 30;
    const x = G.player.pos.x + Math.sin(angle) * dist;
    const z = G.player.pos.z + Math.cos(angle) * dist;
    const clampedX = Math.max(-170, Math.min(170, x));
    const clampedZ = Math.max(-170, Math.min(170, z));
    const police = spawnCar(scene, 'police', clampedX, clampedZ, Math.atan2(G.player.pos.x - clampedX, G.player.pos.z - clampedZ));
    police.lostTimer = 0;
    G.policeCars.push(police);
  }
  // Police that lose the trail for a while give up and drive off.
  for (let i = G.policeCars.length - 1; i >= 0; i--) {
    const police = G.policeCars[i];
    const d = Math.hypot(police.pos.x - G.player.pos.x, police.pos.z - G.player.pos.z);
    if (G.wanted.level === 0 || d > 130) {
      police.lostTimer = (police.lostTimer || 0) + dt;
      if (police.lostTimer > 5 || G.wanted.level === 0) {
        scene.remove(police.mesh);
        G.policeCars.splice(i, 1);
      }
    } else {
      police.lostTimer = 0;
    }
  }
  // Officers on foot only when the player is on foot and the heat is up.
  if (G.wanted.level >= 2 && !G.driving) {
    const alive = G.officers.filter((o) => !o.down).length;
    if (alive < 2) {
      const angle = Math.random() * Math.PI * 2;
      const officer = spawnPoliceOfficer(scene, G.player.pos.x + Math.sin(angle) * 30, G.player.pos.z + Math.cos(angle) * 30);
      G.officers.push(officer);
    }
  }
  if (G.driving || G.wanted.level === 0) {
    for (let i = G.officers.length - 1; i >= 0; i--) {
      const officer = G.officers[i];
      const d = Math.hypot(officer.pos.x - G.player.pos.x, officer.pos.z - G.player.pos.z);
      if (officer.down && d > 60) {
        scene.remove(officer.mesh);
        G.officers.splice(i, 1);
      } else if (!officer.down && (G.driving || G.wanted.level === 0)) {
        scene.remove(officer.mesh);
        G.officers.splice(i, 1);
      }
    }
  }
}

// --- the update --------------------------------------------------------------------
function update(dt) {
  G.time += dt;
  const input = G.input;
  const move = input.move();
  const orbit = input.takeOrbit();
  G.cameraYaw += orbit.yaw;
  G.cameraPitch += orbit.pitch;
  G.cameraDist = Math.max(5, Math.min(15, G.cameraDist + input.takeZoom() * 0.005));

  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    G.state = 'paused';
    showOnly('paused');
    saveGame();
    announce('Paused.');
    return;
  }
  if (actions & ACTION_MUTE) {
    G.audio.setMuted(!G.audio.isMuted());
    G.hud.toast(G.audio.isMuted() ? 'Sound off (M to turn on).' : 'Sound on.');
  }
  if (actions & ACTION_WEAPON) {
    G.combat.weapon = G.combat.weapon === 'pistol' ? 'fists' : 'pistol';
    G.hud.toast(G.combat.weapon === 'pistol' ? 'Pistol ready — click to shoot.' : 'Fists — click to punch.');
  }
  if (actions & ACTION_RELOAD && G.combat.weapon === 'pistol' && G.combat.ammo < PLAYER.magazine) {
    G.combat.reloading = PLAYER.reloadSeconds;
  }

  // Interact: enter/exit a car.
  if (actions & ACTION_INTERACT) {
    if (G.driving) {
      exitCar();
    } else {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
    }
  }
  // Attack: shoot or punch.
  if (actions & ACTION_ATTACK && G.state === 'playing') {
    if (G.combat.weapon === 'pistol' && !G.driving) {
      const result = shootPistol(G, camera);
      if (result && result.hit) {
        if (result.killed === 'pedestrian') commitCrime(G, WANTED.killPedestrian);
        else if (result.killed === 'officer' || result.hurt) commitCrime(G, WANTED.shoot);
        else commitCrime(G, WANTED.shoot);
      } else if (result && result.empty) {
        G.hud.toast('Out of ammo — reloading…');
      }
    } else if (!G.driving) {
      const result = punch(G);
      if (result && result.killed === 'pedestrian') commitCrime(G, WANTED.killPedestrian);
    }
  }

  // --- player movement -------------------------------------------------------
  if (G.driving && G.playerCar) {
    drivePlayerCar(G.playerCar, move, dt, G.colliders, G.cars);
    // The staged chase shot keeps its speed up for the camera.
    if (shot === 'chase') G.playerCar.speed = 24;
    G.player.pos.copy(G.playerCar.pos);
    // Running over pedestrians.
    for (const ped of G.peds) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.pos.x - G.player.pos.x, ped.pos.z - G.player.pos.z);
      if (d < 2.2 && Math.abs(G.playerCar.speed) > 5) {
        ped.state = 'down';
        ped.health = 0;
        ped.mesh.rotation.x = -Math.PI / 2;
        ped.mesh.position.y = 0.3;
        G.effects.burst(ped.pos.clone().setY(1), 0xd83a2e, 12, 4, 0.6);
        G.audio.crash();
        G.shake = Math.max(G.shake, 0.4);
        commitCrime(G, WANTED.hitPedestrian);
      }
    }
    // Police ramming the player's car hurts.
    for (const police of G.policeCars) {
      const d = Math.hypot(police.pos.x - G.player.pos.x, police.pos.z - G.player.pos.z);
      if (d < 4.2 && Math.abs(police.speed) > 6) {
        damagePlayer(G, 6);
        G.audio.crash();
      }
    }
  } else {
    updatePlayerOnFoot(G.player, move, G.cameraYaw, input.jumpHeld(), dt, G.colliders);
  }
  if (G.player.invulnerable > 0) G.player.invulnerable -= dt;

  // --- traffic, pedestrians, police -------------------------------------------
  for (const car of G.cars) {
    if (car.kind === 'traffic' && !car.dead) updateTrafficCar(car, dt, G.colliders, G.cars);
  }
  const gunshotRecent = G.time - G.combat.lastShotAt < 1.5;
  for (const ped of G.peds) {
    const d = Math.hypot(ped.pos.x - G.player.pos.x, ped.pos.z - G.player.pos.z);
    const threat = (G.driving && Math.abs(G.playerCar?.speed || 0) > 8 && d < 8) || (gunshotRecent && d < 22);
    updatePedestrian(ped, dt, G.colliders, G.player.pos, threat);
  }
  for (const police of G.policeCars) {
    updatePoliceCar(police, G.player.pos, dt, G.colliders);
  }
  for (const officer of G.officers) {
    if (officer.down) continue;
    const damage = updatePoliceOfficer(officer, G.player.pos, dt, G.colliders);
    if (damage > 0) damagePlayer(G, damage);
  }
  managePolice(dt);

  // --- missions, wanted, combat ----------------------------------------------
  G.missionStep = G.missions.done ? null : currentStep(G.missions);
  updateMissions(G, dt, input.interactHeld());
  updateWanted(G, dt);
  updateCombat(G, dt);
  G.effects.update(dt);
  G.beacon.update(G.time);

  // --- cash pickups ------------------------------------------------------------
  for (const pickup of G.pickups) {
    if (pickup.taken) continue;
    const d = Math.hypot(pickup.pos.x - G.player.pos.x, pickup.pos.z - G.player.pos.z);
    if (d < 2.4) {
      pickup.taken = true;
      pickup.mesh.visible = false;
      G.cash += MISSIONS.pickupCash;
      G.audio.pickup();
      G.hud.toast(`+$${MISSIONS.pickupCash} cash found.`);
    }
    pickup.mesh.rotation.y += dt * 0.8;
  }

  // --- interact prompt -----------------------------------------------------------
  let prompt = null;
  if (G.driving) {
    prompt = 'E — Get out of the car';
  } else {
    const car = nearestCar(4.5);
    if (car) prompt = car.wasTraffic ? 'E — Steal this car' : 'E — Get in the car';
    else if (G.missionStep && G.missionStep.type === 'hold') {
      const d = Math.hypot(G.missionStep.pos.x - G.player.pos.x, G.missionStep.pos.z - G.player.pos.z);
      if (d < G.missionStep.radius) prompt = 'Hold E — Crack the vault';
    }
  }
  G.hud.setInteract(prompt);

  // --- objective text --------------------------------------------------------------
  if (G.missions.done) {
    G.hud.setObjective('Free roam — King of the Harbor. Find cash, dodge the PD, enjoy the city.');
  } else if (G.missionStep) {
    G.hud.setObjective(`${currentMission(G.missions).title}: ${G.missionStep.label}`);
  }
  G.hud.setCrosshair(G.combat.weapon === 'pistol' && !G.driving);

  // --- audio -----------------------------------------------------------------------
  const speed01 = G.driving ? Math.abs(G.playerCar.speed) / CAR.maxSpeed : 0;
  G.audio.engine(speed01, G.driving);
  const nearestPolice = G.policeCars.reduce((m, c) => Math.min(m, Math.hypot(c.pos.x - G.player.pos.x, c.pos.z - G.player.pos.z)), 999);
  G.audio.siren(nearestPolice < 60 ? 1 - nearestPolice / 60 : 0, dt);

  // --- damage flash ------------------------------------------------------------------
  G.damageFlash = Math.max(0, G.damageFlash - dt * 1.6);
  G.hud.setDamage(G.damageFlash);
  G.shake = Math.max(0, G.shake - dt * 1.8);

  // --- autosave ------------------------------------------------------------------------
  G.saveTimer += dt;
  if (G.saveTimer > 15) {
    G.saveTimer = 0;
    saveGame();
  }

  G.hud.update(G, dt);
}

// --- the camera ----------------------------------------------------------------------
function updateCamera(dt) {
  const target = G.driving && G.playerCar ? G.playerCar.pos : G.player.pos;
  const focus = new THREE.Vector3(target.x, target.y + 1.8, target.z);
  let yaw = G.cameraYaw;
  let pitch = G.cameraPitch;
  if (G.driving && G.playerCar) {
    // Chase camera: swing behind the car, keep the player's drag offset.
    const behind = G.playerCar.heading + Math.PI;
    let d = behind - yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    yaw += d * Math.min(1, dt * 1.6);
    pitch = 0.38;
    G.cameraDist = Math.max(G.cameraDist, 10);
  }
  // Keep the camera out of buildings: pull it toward the focus until clear.
  let dist = G.cameraDist;
  let cx = focus.x;
  let cz = focus.z;
  let cy = focus.y + 2;
  for (;;) {
    cx = focus.x - Math.sin(yaw) * Math.cos(pitch) * dist;
    cz = focus.z - Math.cos(yaw) * Math.cos(pitch) * dist;
    cy = focus.y + Math.sin(pitch) * dist + 1.2;
    if (dist <= 4 || !pointInBuilding(cx, cz, G.colliders)) break;
    dist -= 1;
  }
  const shake = G.shake * G.shake;
  camera.position.set(
    cx + (Math.random() - 0.5) * shake,
    cy + (Math.random() - 0.5) * shake,
    cz + (Math.random() - 0.5) * shake,
  );
  camera.lookAt(focus);
  const speed01 = G.driving ? Math.abs(G.playerCar.speed) / CAR.maxSpeed : 0;
  const wantFov = 62 + speed01 * 12;
  if (Math.abs(camera.fov - wantFov) > 0.1) {
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }
}

// --- title-screen attract camera --------------------------------------------------------
let attractAngle = 0;
function updateAttractCamera(dt) {
  attractAngle += dt * 0.05;
  const r = 190;
  camera.position.set(Math.sin(attractAngle) * r, 70, Math.cos(attractAngle) * r);
  camera.lookAt(0, 10, 40);
}

// --- shot staging -------------------------------------------------------------------------
function stageShot(name) {
  if (name === 'start') {
    G.state = 'title';
    showOnly('title');
    return;
  }
  // Every other shot plays the game, staged for the camera.
  G.state = 'playing';
  showOnly(null);
  G.audio.setMuted(true);
  if (name === 'street') {
    // On foot by the plaza, with traffic rolling past and people around.
    // (No banner here: the objective line at the top says the job.)
    G.player.pos.set(14, 0, 32);
    G.player.heading = -Math.PI / 2; // facing the avenue, where traffic passes
    G.cameraYaw = -Math.PI / 2; // camera on the plaza side, road behind the player
    G.cameraPitch = 0.28;
    G.cameraDist = 8;
    G.missions.index = 0;
    G.missions.started = true;
    // Two cars driving past on the avenue, four pedestrians nearby.
    const pass1 = spawnCar(scene, 'traffic', 0, 44, 0);
    pass1.axis = 'z';
    pass1.dir = 1;
    pass1.targetSpeed = 9;
    pass1.speed = 9;
    G.cars.push(pass1);
    const pass2 = spawnCar(scene, 'traffic', -3, 60, Math.PI);
    pass2.axis = 'z';
    pass2.dir = -1;
    pass2.targetSpeed = 9;
    pass2.speed = 9;
    G.cars.push(pass2);
    const nearSpots = [[10, 28], [18, 36], [12, 22], [20, 26]];
    G.peds.slice(0, 4).forEach((ped, i) => {
      ped.pos.set(nearSpots[i][0], 0, nearSpots[i][1]);
      ped.heading = Math.random() * Math.PI * 2;
    });
  } else if (name === 'chase') {
    const car = spawnCar(scene, 'player', 0, -80, 0);
    car.wasTraffic = false;
    G.cars.push(car);
    G.driving = true;
    G.playerCar = car;
    G.player.mesh.visible = false;
    car.speed = 24;
    G.wanted.level = 3;
    G.missions.index = 1;
    G.missions.started = true;
    G.missions.step = 1;
    // Police close behind, offset to the sides so they read in frame.
    const police1 = spawnCar(scene, 'police', -7, -98, 0);
    const police2 = spawnCar(scene, 'police', 7, -106, 0);
    police1.speed = 26;
    police2.speed = 25;
    G.policeCars.push(police1, police2);
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.38;
    G.cameraDist = 15;
  } else if (name === 'mission') {
    // At the crossroads southwest of the bank, facing it and its beacon.
    G.player.pos.set(-52, 0, -52);
    G.player.heading = Math.PI / 4;
    G.cameraYaw = Math.PI / 4;
    G.cameraPitch = 0.36;
    G.cameraDist = 13;
    G.missions.index = 2;
    G.missions.started = true;
    G.missions.step = 0;
    G.cash = 1300;
  }
  G.hud.update(G, 0.016);
}

// --- the frame loop -------------------------------------------------------------------------
let last = performance.now();
const shotStart = performance.now();
let fpsEma = 60;
let qualityChecked = false;

function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  // Adaptive quality: on a slow renderer (software GL, weak machines)
  // drop the shadow map once, so the game stays playable everywhere.
  if (rawDt > 0) fpsEma = fpsEma * 0.95 + (1 / rawDt) * 0.05;
  if (!qualityChecked && now - shotStart > 4000) {
    qualityChecked = true;
    if (fpsEma < 10 && G.sun) {
      G.sun.castShadow = false;
      renderer.setPixelRatio(1);
    }
  }
  if (G.state === 'playing') {
    update(dt);
    updateCamera(dt);
  } else if (G.state === 'paused') {
    // Esc resumes from the pause menu too.
    const actions = G.input.takeActions();
    if (actions & ACTION_PAUSE) {
      G.state = 'playing';
      showOnly(null);
    }
  } else if (G.state === 'title') {
    G.time += dt;
    updateAttractCamera(dt);
    // Idle life behind the title: traffic rolls on.
    for (const car of G.cars) {
      if (car.kind === 'traffic' && !car.dead) updateTrafficCar(car, dt, G.colliders, G.cars);
    }
    for (const ped of G.peds) updatePedestrian(ped, dt, G.colliders, G.player.pos, false);
    G.effects.update(dt);
  }
  renderer.render(scene, camera);
  // Shot mode: declare readiness by wall time, not frame count — a
  // software renderer may paint slowly, but the staged scene is set.
  if (shot && !window.__shotReady && now - shotStart > 3000) {
    window.__shotReady = true;
  }
}

if (shot) {
  stageShot(shot);
} else {
  showOnly('title');
}
announce('Neon Harbor. A sun-soaked open-world crime game. Press Start to play.');
requestAnimationFrame(frame);
