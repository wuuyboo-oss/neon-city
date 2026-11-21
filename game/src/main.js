// Neon Harbor — main loop. Fixed 60Hz simulation, adaptive quality, start screen, ?shot= poses.
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { createWorld, stepWorld, resetWorld } from './world.js';
import { createRenderer, buildScene, renderFrame } from './render.js';
import { buildHud, drawHud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1337);

const canvas = document.getElementById('game');
const input = new Input();
input.attach(canvas);
const audio = new AudioSys();
const state = createWorld(seed, audio);
state.save = () => writeSave(state);

// Resume a previous run if one exists.
const saved = loadSave();
if (saved && !shotName) {
  state.cash = saved.cash || 0; state.mission = saved.mission || 0;
  state.vaultStep = saved.vaultStep || 0; state.won = !!saved.won;
  if (typeof saved.x === 'number') { state.player.x = saved.x; state.player.z = saved.z; }
}

const R = createRenderer(canvas);
const S = buildScene(R, state);
const hud = buildHud(document);
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

function startGame() {
  audio.init();
  state.started = true;
  startScreen.style.display = 'none';
  canvas.focus();
}
startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', (e) => {
  if (!state.started && (e.code === 'Enter' || e.code === 'Space')) startGame();
  if (e.code === 'KeyR' && state.started) { resetWorld(state); }
  if (e.code === 'KeyM') { audio.muted = !audio.muted; }
});

// Driver / debug handle: the Playwright drive reads this, never writes it.
window.__game = state;
window.__neon = { state, startGame };

if (shotName) {
  const screen = stageShot(shotName, state);
  if (screen === 'title') startScreen.style.display = 'flex';
  else startScreen.style.display = 'none';
  // Render one settled frame immediately so a screenshot has a full scene.
  renderFrame(R, S, state, canvas.clientWidth || 1280, canvas.clientHeight || 720);
  drawHud(hud, state);
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
let fpsFrames = 0, fpsT = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  fpsFrames++; fpsT += dt;
  if (fpsT >= 1) { state.fps = fpsFrames / fpsT; fpsFrames = 0; fpsT = 0; }
  acc += dt;
  state.camYaw -= input.mouseDX * 0.005; // once per frame, never per simulation step
  let n = 0;
  while (acc >= STEP && n < 20) { stepWorld(state, input, STEP); acc -= STEP; n++; }
  if (n === 20) acc = 0; // very slow frame: drop the backlog rather than spiral
  audio.siren(state.wanted > 0, dt);
  renderFrame(R, S, state, canvas.clientWidth, canvas.clientHeight);
  drawHud(hud, state);
  input.endFrame();
}
requestAnimationFrame(frame);
