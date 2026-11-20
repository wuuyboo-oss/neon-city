// Neon Harbor — the HUD: cash, health, wanted stars, speed, weapon,
// mission objective, toasts, banners and the live minimap.
// The minimap is a small 2D canvas drawn from the city data: roads,
// water, buildings, the player arrow and blips for the mission,
// the police and nearby cars.

import { WORLD, PLAYER } from './config.js';
import { ROAD_COORDS } from './city.js';

function $(id) {
  return document.getElementById(id);
}

/** Build the HUD controller over the DOM in index.html. */
export function createHud(city) {
  const els = {
    cash: $('cash'),
    healthFill: $('health-fill'),
    healthText: $('health-text'),
    stars: $('stars'),
    objective: $('objective'),
    speed: $('speed'),
    weapon: $('weapon'),
    ammo: $('ammo'),
    toast: $('toast'),
    banner: $('banner'),
    bannerTitle: $('banner-title'),
    bannerText: $('banner-text'),
    interact: $('interact'),
    damage: $('damage'),
    crosshair: $('crosshair'),
    minimap: $('minimap'),
  };
  const mapCtx = els.minimap.getContext('2d');
  let toastTimer = 0;
  let bannerTimer = 0;

  function worldToMap(x, z) {
    const s = els.minimap.width / (WORLD.cityHalf * 2 + 80);
    return {
      x: (x + WORLD.cityHalf + 40) * s,
      y: (z + WORLD.cityHalf + 40) * s,
    };
  }

  return {
    /** A short line at the bottom of the screen. */
    toast(text) {
      if (!text) return;
      els.toast.textContent = text;
      els.toast.style.opacity = '1';
      toastTimer = 3.5;
    },
    /** A big center banner with a title and a line of story. */
    showBanner(title, text) {
      els.bannerTitle.textContent = title;
      els.bannerText.textContent = text || '';
      els.banner.style.opacity = '1';
      bannerTimer = 5;
    },
    setObjective(text) {
      els.objective.textContent = text;
    },
    setInteract(text) {
      if (text) {
        els.interact.textContent = text;
        els.interact.style.display = 'block';
      } else {
        els.interact.style.display = 'none';
      }
    },
    setDamage(amount) {
      els.damage.style.opacity = String(Math.max(0, Math.min(0.85, amount)));
    },
    setCrosshair(visible) {
      els.crosshair.style.display = visible ? 'block' : 'none';
    },
    /** Refresh every number and bar from the game state. */
    update(G, dt) {
      els.cash.textContent = `$${G.cash.toLocaleString('en-US')}`;
      const hp = Math.max(0, Math.round(G.player.health));
      els.healthFill.style.width = `${hp}%`;
      els.healthFill.style.background = hp > 50 ? '#37c978' : hp > 25 ? '#f2c230' : '#e5484d';
      els.healthText.textContent = `${hp}`;
      let stars = '';
      for (let i = 0; i < 5; i++) stars += i < G.wanted.level ? '★' : '☆';
      els.stars.textContent = stars;
      els.stars.style.color = G.wanted.level > 0 ? '#ffd23a' : '#888888';
      const driving = G.driving;
      const kmh = driving ? Math.round(Math.abs(G.playerCar.speed) * 3.6) : 0;
      els.speed.textContent = driving ? `${kmh} km/h` : '';
      els.weapon.textContent = G.combat.weapon === 'pistol' ? 'PISTOL' : 'FISTS';
      els.ammo.textContent = G.combat.weapon === 'pistol'
        ? (G.combat.reloading > 0 ? 'RELOADING…' : `${G.combat.ammo} / ${PLAYER.magazine}`)
        : '—';
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) els.toast.style.opacity = '0';
      }
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) els.banner.style.opacity = '0';
      }
      this.drawMinimap(G);
    },
    /** The minimap: roads, water, buildings, player, mission, police. */
    drawMinimap(G) {
      const w = els.minimap.width;
      const h = els.minimap.height;
      mapCtx.clearRect(0, 0, w, h);
      mapCtx.fillStyle = 'rgba(12, 20, 28, 0.85)';
      mapCtx.fillRect(0, 0, w, h);
      // Water at the bottom (south).
      const waterTop = worldToMap(0, WORLD.waterStart);
      mapCtx.fillStyle = '#1f7fa8';
      mapCtx.fillRect(0, waterTop.y, w, h - waterTop.y);
      // Buildings as faint blocks.
      mapCtx.fillStyle = 'rgba(200, 200, 190, 0.55)';
      for (const c of city.colliders) {
        const a = worldToMap(c.minX, c.minZ);
        const b = worldToMap(c.maxX, c.maxZ);
        mapCtx.fillRect(a.x, a.y, Math.max(1, b.x - a.x), Math.max(1, b.y - a.y));
      }
      // Roads.
      mapCtx.strokeStyle = 'rgba(240, 240, 230, 0.8)';
      mapCtx.lineWidth = 2;
      for (const c of ROAD_COORDS) {
        const a = worldToMap(c, -WORLD.cityHalf);
        const b = worldToMap(c, WORLD.cityHalf);
        mapCtx.beginPath();
        mapCtx.moveTo(a.x, a.y);
        mapCtx.lineTo(b.x, b.y);
        mapCtx.stroke();
        const c2 = worldToMap(-WORLD.cityHalf, c);
        const d2 = worldToMap(WORLD.cityHalf, c);
        mapCtx.beginPath();
        mapCtx.moveTo(c2.x, c2.y);
        mapCtx.lineTo(d2.x, d2.y);
        mapCtx.stroke();
      }
      // Mission marker.
      const step = G.missionStep;
      if (step) {
        const m = worldToMap(step.pos.x, step.pos.z);
        const pulse = 4 + Math.sin(G.time * 4) * 1.5;
        mapCtx.fillStyle = '#ffd23a';
        mapCtx.beginPath();
        mapCtx.arc(m.x, m.y, pulse, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.strokeStyle = '#7a5a00';
        mapCtx.stroke();
      }
      // Police blips (red) and traffic (grey dots).
      mapCtx.fillStyle = '#ff4a4a';
      for (const car of G.policeCars) {
        const m = worldToMap(car.pos.x, car.pos.z);
        mapCtx.beginPath();
        mapCtx.arc(m.x, m.y, 3.5, 0, Math.PI * 2);
        mapCtx.fill();
      }
      mapCtx.fillStyle = 'rgba(200, 200, 200, 0.7)';
      for (const car of G.cars) {
        if (car.kind !== 'traffic' || car.dead) continue;
        const m = worldToMap(car.pos.x, car.pos.z);
        mapCtx.fillRect(m.x - 1, m.y - 1, 2, 2);
      }
      // The player arrow, pointing where they face.
      const p = worldToMap(G.player.pos.x, G.player.pos.z);
      const heading = G.driving ? G.playerCar.heading : G.player.heading;
      mapCtx.save();
      mapCtx.translate(p.x, p.y);
      mapCtx.rotate(Math.PI - heading);
      mapCtx.fillStyle = '#ffffff';
      mapCtx.beginPath();
      mapCtx.moveTo(0, -6);
      mapCtx.lineTo(4.5, 5);
      mapCtx.lineTo(-4.5, 5);
      mapCtx.closePath();
      mapCtx.fill();
      mapCtx.strokeStyle = '#111111';
      mapCtx.stroke();
      mapCtx.restore();
    },
  };
}
