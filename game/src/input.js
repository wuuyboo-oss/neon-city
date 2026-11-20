// Neon Harbor — keyboard and mouse input.
// Held keys give movement and driving; one-shot presses (interact,
// weapon switch, reload, pause, mute) are queued as flags and taken
// once by the loop, so a press between two frames is never lost and
// never counted twice. Dragging the mouse orbits the camera.

export const ACTION_INTERACT = 1;
export const ACTION_ATTACK = 2;
export const ACTION_WEAPON = 4;
export const ACTION_RELOAD = 8;
export const ACTION_PAUSE = 16;
export const ACTION_MUTE = 32;

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragYaw = 0;
  let dragPitch = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let wheelDelta = 0;

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS.has(event.code)) {
      keys.add(event.code);
      // E is also a one-shot interact (enter/exit a car) as well as a
      // held key (crack the vault): queue the press, keep the hold.
      // (E is in MOVE_KEYS, so it is always caught here — there is no
      // separate E branch below.)
      if (event.code === 'KeyE' && !event.repeat) actions |= ACTION_INTERACT;
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'Digit1' || event.code === 'Digit2') actions |= ACTION_WEAPON;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    // Clicking the canvas attacks (shoot / punch); dragging orbits.
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragYaw -= (event.clientX - lastX) * 0.005;
    dragPitch -= (event.clientY - lastY) * 0.004;
    dragPitch = Math.max(-0.5, Math.min(0.6, dragPitch));
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    // A click without a drag is an attack.
    if (Math.abs(event.clientX - lastX) < 4 && Math.abs(event.clientY - lastY) < 4) {
      actions |= ACTION_ATTACK;
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', (event) => {
    wheelDelta += event.deltaY;
    event.preventDefault();
  }, { passive: false });

  return {
    /** Whether E is currently held down (for hold-to-rob). */
    interactHeld() {
      return keys.has('KeyE');
    },
    /** Mouse-wheel zoom accumulated since the last call. */
    takeZoom() {
      const out = wheelDelta;
      wheelDelta = 0;
      return out;
    },
    /** Forward/back/strafe as -1..1 in camera space. */
    move() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { forward: f, strafe: s, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    jumpHeld() {
      return keys.has('Space');
    },
    /** Camera orbit deltas (radians) accumulated since the last call. */
    takeOrbit() {
      const out = { yaw: dragYaw, pitch: dragPitch };
      dragYaw = 0;
      dragPitch = 0;
      return out;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
