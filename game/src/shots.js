// Screenshot poses for ?shot= — each stages the real world, then the normal renderer draws it.
import { stepPolice } from './police.js';

export function stageShot(name, state) {
  state.started = true;
  state.won = false;
  if (name === 'chase') {
    state.player.x = 0; state.player.z = 0; state.player.angle = Math.PI;
    state.wanted = 3; state.quietT = 0;
    state.police = [];
    for (let i = 0; i < 3; i++) stepPolice(state, 0.5, state.cols);
    state.flash = 'WANTED ★★★ — lose the cops!';
    state.flashT = 3;
    return 'play';
  }
  if (name === 'street') {
    const car = state.cars.find(c => c.parked) || state.cars[0];
    state.inCar = true; state.car = car; car.parked = false; car.ai = false; car.playerOwned = true;
    car.x = 40; car.z = -3; car.angle = Math.PI / 2; car.speed = 12;
    state.player.x = car.x; state.player.z = car.z; state.player.angle = car.angle;
    state.camYaw = car.angle + Math.PI;
    state.mission = 1;
    state.flash = 'M2 — deliver the car to the chop shop';
    state.flashT = 3;
    return 'play';
  }
  if (name === 'mission') {
    state.player.x = -26; state.player.z = -38; state.player.angle = Math.PI;
    state.camYaw = Math.PI;
    state.mission = 2; state.vaultStep = 1; state.vaultProgress = 1.5;
    state.flash = 'HOLD E — cracking the vault…';
    state.flashT = 3;
    return 'play';
  }
  // 'start' (and anything else): title view over the live city.
  state.started = false;
  state.player.x = 0; state.player.z = 8; state.player.angle = Math.PI;
  state.camYaw = Math.PI;
  return 'title';
}
