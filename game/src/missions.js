// Missions: 3 chained jobs, $500 / $800 / $2,000 = $3,300 total.
// M1: walk to the hideout front door. M2: steal a car, deliver it to the chop shop.
// M3: hold E at the bank vault steps (real key press), then escape until wanted hits 0.
import { MISSIONS } from './config.js';
import { dist2 } from './rng.js';

export const MISSION_NAMES = [
  'M1 — Meet the fixer at the hideout',
  'M2 — Steal a car, deliver it to the chop shop',
  'M3 — Rob the bank vault, then lose the heat',
];

export function missionObjective(state) {
  const m = state.mission;
  if (state.won) return 'KING OF THE HARBOR — you own Neon Harbor.';
  if (m === 0) return 'M1: Go to the hideout front door (pink marker).';
  if (m === 1) return 'M2: Get in a car (E) and drive it to the chop shop (yellow marker).';
  if (m === 2) {
    if (state.vaultStep === 0) return 'M3: Reach the bank front steps (gold marker).';
    if (state.vaultStep === 1) return 'M3: HOLD E at the vault to crack it…';
    return 'M3: ESCAPE! Lose the cops until wanted hits 0.';
  }
  return '';
}

export function missionTarget(state) {
  if (state.mission === 0) return { ...MISSIONS.hideout, color: 0xff2d78 };
  if (state.mission === 1) return { ...MISSIONS.chopshop, color: 0xffd400 };
  return { ...MISSIONS.bank, color: 0xffd400 };
}

export function stepMissions(state, input, dt) {
  const p = state.player;
  if (state.won) return;
  if (state.mission === 0) {
    const t = MISSIONS.hideout;
    if (dist2(p.x, p.z, t.x, t.z) < t.r * t.r) completeMission(state, 0);
  } else if (state.mission === 1) {
    const t = MISSIONS.chopshop;
    if (state.inCar && dist2(p.x, p.z, t.x, t.z) < t.r * t.r) completeMission(state, 1);
  } else if (state.mission === 2) {
    const t = MISSIONS.bank;
    const inR = dist2(p.x, p.z, t.x, t.z) < t.r * t.r;
    if (state.vaultStep === 0) {
      if (inR && !state.inCar) state.vaultStep = 1;
    } else if (state.vaultStep === 1) {
      // Vault hold completes ONLY by a real E key press held in the radius.
      if (inR && input.down('KeyE')) {
        state.vaultProgress += dt;
        if (state.vaultProgress >= MISSIONS.vaultHold) {
          state.vaultStep = 2;
          state.cash += 0; // payout lands on escape
          // Heat is set ONCE here (heatSet flag) — never re-applied per frame.
          if (!state.heatSet) { state.heatSet = true; state.wanted = Math.max(state.wanted, 3); }
          state.flash = 'VAULT CRACKED! $2,000 — now ESCAPE!';
          state.flashT = 3;
          state.audio?.mission();
        }
      } else state.vaultProgress = Math.max(0, state.vaultProgress - dt * 2);
    } else if (state.vaultStep === 2) {
      if (state.wanted === 0) {
        state.cash += MISSIONS.pay[2];
        state.won = true;
        state.flash = 'KING OF THE HARBOR';
        state.audio?.mission();
        state.save?.();
      }
    }
  }
}

function completeMission(state, idx) {
  state.cash += MISSIONS.pay[idx];
  state.mission = idx + 1;
  state.flash = idx === 0 ? 'M1 DONE — +$500. Steal a car for M2.' : 'M2 DONE — +$800. Hit the bank for M3.';
  state.flashT = 3;
  state.audio?.mission();
  state.audio?.pickup();
  state.save?.();
}
