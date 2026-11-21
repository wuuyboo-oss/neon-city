// Keyboard + mouse input. Tracks held keys, edge presses, and camera drag.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed by endFrame()
    this.mouseDX = 0; this.mouseDY = 0;
    this.mouseDown = false; this.clicked = false;
    this.dragging = false; this.lastX = 0; this.lastY = 0;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseDown = (e) => { this.mouseDown = true; this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; this.dragDist = 0; };
    this._onMouseUp = () => {
      // A press counts as a click (fire) only if the pointer barely moved — dragging the
      // camera must not shoot.
      if (this.mouseDown && (this.dragDist || 0) < 6) {
        this.clicked = true;
        window.__clickLog = window.__clickLog || [];
        window.__clickLog.push({ t: performance.now(), drag: this.dragDist });
      }
      this.mouseDown = false; this.dragging = false;
    };
    this._onMouseMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.mouseDX += dx; this.mouseDY += dy;
      this.dragDist = (this.dragDist || 0) + Math.abs(dx) + Math.abs(dy);
      this.lastX = e.clientX; this.lastY = e.clientY;
    };
    this._onBlur = () => { this.keys.clear(); this.dragging = false; };
  }
  attach(el) {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    el.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('blur', this._onBlur);
  }
  down(code) { return this.keys.has(code); }
  // Edge press, consumed on first read — so one key press fires once even when the
  // fixed-step loop runs many steps inside a single slow frame.
  wasPressed(code) { if (this.pressed.has(code)) { this.pressed.delete(code); return true; } return false; }
  axis() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    return { x, z };
  }
  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; this.clicked = false; }
}
