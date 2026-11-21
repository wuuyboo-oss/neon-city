// localStorage save: cash, mission progress, best result. Loaded at boot, saved on progress.
const KEY = 'neon-harbor-save-v1';
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash, mission: state.mission, vaultStep: state.vaultStep,
      won: state.won, hp: state.player.hp, x: state.player.x, z: state.player.z,
      savedAt: Date.now(),
    }));
  } catch { /* storage unavailable — game still runs */ }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
