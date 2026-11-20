// Neon Harbor — missions and the story.
// Rex Marlowe, a wheelman fresh out of Harbor Pen, owes the fixer
// Vera Kade one last run of jobs. Three missions chain together:
// a pickup at the docks, a getaway with a passenger, and the Harbor
// Bank job. Each step is a place to reach (shown by the beacon and
// the minimap), a thing to hold, or a place to escape to. Cash is
// the progression: finish all three and the city is yours.

import { WORLD, MISSIONS } from './config.js';
import { commitCrime } from './wanted.js';

export const MISSION_DEFS = [
  // Step positions are the landmarks' ENTRANCES (WORLD.hideout and
  // WORLD.bank in config.js point at the front door / front steps, not
  // at the building centers): a goto/hold step completes within 6-8
  // units, and the walls keep a player 6-11 units from a center, so a
  // center target could never complete. The docks and the plaza are
  // open ground and need no such offset.
  {
    id: 'pickup',
    title: 'Job 1 — Harbor Pickup',
    intro: 'Vera: "Rex, you are out. One package at the docks, no questions. Bring it to the hideout and we are square."',
    reward: MISSIONS.pickupReward,
    steps: [
      { type: 'goto', label: 'Drive to the docks and grab the package', pos: WORLD.docks, radius: 6 },
      { type: 'goto', label: 'Deliver the package to the hideout', pos: WORLD.hideout, radius: 6 },
    ],
  },
  {
    id: 'getaway',
    title: 'Job 2 — The Getaway',
    intro: 'Vera: "My driver got pinched. Pick me up at the plaza — and bring a fast car. The PD will be all over us."',
    reward: MISSIONS.getawayReward,
    steps: [
      { type: 'goto', label: 'Pick Vera up at the plaza', pos: WORLD.plaza, radius: 6 },
      { type: 'escape', label: 'Lose the cops and reach the hideout', pos: WORLD.hideout, radius: 6, wanted: 2 },
    ],
  },
  {
    id: 'bank',
    title: 'Job 3 — The Harbor Bank Job',
    intro: 'Vera: "Last one, Rex. The Harbor Bank vault, five seconds of nerve, then run like the whole city is behind you — because it will be."',
    reward: MISSIONS.bankReward,
    steps: [
      { type: 'goto', label: 'Get to the Harbor Bank', pos: WORLD.bank, radius: 8 },
      { type: 'hold', label: 'Hold E to crack the vault', pos: WORLD.bank, radius: 8, holdSeconds: MISSIONS.robSeconds },
      { type: 'escape', label: 'Escape the heat — reach the hideout', pos: WORLD.hideout, radius: 6, wanted: 4 },
    ],
  },
];

/** Create the mission state: which job, which step, and hold progress. */
export function createMissions() {
  return {
    index: 0,
    step: 0,
    holdProgress: 0,
    done: false,
    started: false,
    heatSet: false, // the current escape step has set its wanted level
  };
}

export function currentMission(missions) {
  return MISSION_DEFS[missions.index] || null;
}

export function currentStep(missions) {
  const mission = currentMission(missions);
  return mission ? mission.steps[missions.step] : null;
}

/** Start (or restart) the current mission: show its intro and point the beacon. */
export function startMission(G) {
  const mission = currentMission(G.missions);
  if (!mission) return;
  G.missions.started = true;
  G.missions.step = 0;
  G.missions.holdProgress = 0;
  G.missions.heatSet = false;
  G.hud.showBanner(mission.title, mission.intro);
  G.audio.missionDone();
}

/** Advance one step; finishing a mission pays out and starts the next. */
function advanceStep(G) {
  const missions = G.missions;
  const mission = currentMission(missions);
  missions.step += 1;
  missions.holdProgress = 0;
  missions.heatSet = false;
  if (missions.step >= mission.steps.length) {
    G.cash += mission.reward;
    G.hud.showBanner('JOB DONE', `+ $${mission.reward} — ${mission.title} complete.`);
    G.audio.missionDone();
    missions.index += 1;
    missions.step = 0;
    missions.started = false;
    if (missions.index >= MISSION_DEFS.length) {
      missions.done = true;
      G.hud.showBanner('KING OF THE HARBOR', 'All three jobs done. The city is yours now, Rex — free roam, keep the cash coming.');
    } else {
      G.hud.toast('New job from Vera — check the objective.');
    }
  }
}

/** Distance from the player (on foot or in the car) to a position. */
function playerDistance(G, pos) {
  const p = G.player.pos;
  return Math.hypot(p.x - pos.x, p.z - pos.z);
}

/** Step the mission logic: arrivals, holds, escapes and the beacon. */
export function updateMissions(G, dt, interactHeld) {
  const missions = G.missions;
  const mission = currentMission(missions);
  if (!mission || missions.done) {
    G.beacon.set({ x: 0, z: 0 }, false);
    return;
  }
  if (!missions.started) {
    startMission(G);
    return;
  }
  const step = currentStep(missions);
  if (!step) return;
  const dist = playerDistance(G, step.pos);
  G.beacon.set(step.pos, true);

  if (step.type === 'goto') {
    // This branch only runs for goto steps, so the toast is unconditional.
    if (dist < step.radius) {
      G.hud.toast('Objective reached.');
      advanceStep(G);
    }
    return;
  }
  if (step.type === 'escape') {
    // The escape sets the heat ONCE, when the step begins. Setting it
    // every frame would undo the decay: the moment a star faded
    // (4 -> 3), the step would push it straight back to 4 and zero
    // the quiet timer, so the escape could never complete. Measured
    // in a real drive, the timer reached 12 twice and the level was
    // forced back both times. heatSet (cleared when the step
    // advances) stops that — after the one-time set, the heat is
    // the player's to lose.
    if (!missions.heatSet) {
      if (G.wanted.level < step.wanted) {
        G.wanted.level = step.wanted;
        G.wanted.quietTimer = 0;
        G.hud.toast(`WANTED LEVEL ${step.wanted} — run!`);
      }
      missions.heatSet = true;
    }
    if (dist < step.radius && G.wanted.level <= 2) {
      advanceStep(G);
    } else if (dist < step.radius) {
      G.hud.setObjective(`${step.label} — lose the cops first!`);
    }
    return;
  }
  if (step.type === 'hold') {
    if (dist < step.radius && interactHeld) {
      missions.holdProgress += dt;
      G.hud.setObjective(`${step.label}… ${Math.ceil(step.holdSeconds - missions.holdProgress)}s`);
      if (missions.holdProgress >= step.holdSeconds) {
        commitCrime(G, 1);
        advanceStep(G);
      }
    } else {
      missions.holdProgress = Math.max(0, missions.holdProgress - dt * 2);
    }
  }
}

/** The cash pickups scattered around the city: ten green stacks. */
export function spawnCashPickups(scene, THREE) {
  const pickups = [];
  const geo = new THREE.BoxGeometry(1.4, 0.5, 1.0);
  const mat = new THREE.MeshLambertMaterial({ color: 0x30b06a });
  const mat2 = new THREE.MeshLambertMaterial({ color: 0x2a8a55 });
  // Cash sits on the roads, never inside a building: each spot has at
  // least one coordinate on a road line.
  const spots = [
    { x: -52, z: -26 }, { x: 52, z: 78 }, { x: -26, z: 52 }, { x: 104, z: -52 },
    { x: -104, z: 26 }, { x: 26, z: 104 }, { x: -78, z: -104 }, { x: 0, z: -78 },
    { x: 78, z: 0 }, { x: -52, z: -78 },
  ];
  for (const s of spots) {
    const group = new THREE.Group();
    const a = new THREE.Mesh(geo, mat);
    a.position.y = 0.5;
    a.rotation.y = 0.4;
    group.add(a);
    const b = new THREE.Mesh(geo, mat2);
    b.position.y = 0.9;
    b.rotation.y = -0.3;
    group.add(b);
    group.position.set(s.x, 0, s.z);
    scene.add(group);
    pickups.push({ mesh: group, pos: { x: s.x, z: s.z }, taken: false });
  }
  return pickups;
}
