// HUD: health, cash, wanted stars, mission text, flash messages, and a LIVE minimap.
import { missionObjective, missionTarget } from './missions.js';
import { CITY } from './config.js';

export function buildHud(doc) {
  const el = (id) => doc.getElementById(id);
  return {
    health: el('health-fill'), healthText: el('health-text'),
    cash: el('cash'), stars: el('stars'), mission: el('mission'),
    flash: el('flash'), speed: el('speed'), minimap: el('minimap'),
    ctx: el('minimap').getContext('2d'),
  };
}

export function drawHud(hud, state) {
  const p = state.player;
  hud.health.style.width = `${Math.max(0, p.hp)}%`;
  hud.healthText.textContent = `HP ${Math.ceil(Math.max(0, p.hp))}`;
  hud.cash.textContent = `$${state.cash.toLocaleString()}`;
  hud.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  hud.stars.style.color = state.wanted > 0 ? '#ff3b30' : '#888';
  hud.mission.textContent = missionObjective(state);
  hud.flash.textContent = state.flash || '';
  hud.speed.textContent = state.inCar ? `${Math.round(Math.abs(state.car?.speed || 0) * 3.6)} km/h` : (state.inCar ? '' : 'ON FOOT');
  drawMinimap(hud, state);
}

function drawMinimap(hud, state) {
  const ctx = hud.ctx, S = 160, half = CITY.half;
  const toMap = (x, z) => [(x + half) / (2 * half) * S, (z + half) / (2 * half) * S];
  ctx.fillStyle = '#0a0e18'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#2a2e3a'; ctx.lineWidth = 1;
  for (let v = -half; v <= half; v += 40) {
    const [x1] = toMap(v, -half), [, y1] = toMap(-half, v);
    ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(S, y1); ctx.stroke();
  }
  ctx.fillStyle = '#3a4152';
  for (const b of state.city.buildings) {
    const [x, y] = toMap(b.x - b.w / 2, b.z - b.d / 2);
    ctx.fillRect(x, y, b.w / (2 * half) * S, b.d / (2 * half) * S);
  }
  const t = missionTarget(state);
  const [tx, ty] = toMap(t.x, t.z);
  ctx.fillStyle = '#ff2d78'; ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd400';
  for (const pk of state.pickups) { const [x, y] = toMap(pk.x, pk.z); ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  ctx.fillStyle = '#2244ff';
  for (const c of state.police) { const [x, y] = toMap(c.x, c.z); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  const [px, py] = toMap(state.player.x, state.player.z);
  ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#00e5ff'; ctx.beginPath(); ctx.moveTo(px, py);
  ctx.lineTo(px + Math.sin(state.player.angle) * 8, py + Math.cos(state.player.angle) * 8); ctx.stroke();
}
