// Neon Harbor — save and load.
// Progress lives in this browser only (localStorage): cash, which
// mission is current, where the player stands and how much health
// they have. A missing or corrupt save simply starts a new game.

export const SAVE_KEY = 'neon-harbor.save.v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: Number.isFinite(data.cash) ? data.cash : 0,
      missionIndex: Number.isFinite(data.missionIndex) ? data.missionIndex : 0,
      storyDone: data.storyDone === true,
      x: Number.isFinite(data.x) ? data.x : 0,
      z: Number.isFinite(data.z) ? data.z : 0,
      health: Number.isFinite(data.health) ? data.health : 100,
    };
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: nothing to clear.
  }
}
