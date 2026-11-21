// Neon Harbor — tuning, targets, palette. All numbers in one place.
export const CITY = { half: 160, street: 40, roadW: 10 };
export const PLAYER = { speed: 10, radius: 0.9, hp: 100, turn: 10 };
export const CAR = { accel: 14, maxSpeed: 24, reverse: 8, turn: 1.9, brake: 22, radius: 1.6 };
export const POLICE = { speed: 15, turn: 1.4, count: 3, ramDamage: 2, giveUp: 45, quietRadius: 25, decay: 12 };
export const PED = { threatRadius: 14, fleeSpeed: 8, walkSpeed: 2.2, count: 12 };
export const TRAFFIC = { count: 10, speed: 9 };
export const MISSIONS = {
  pay: [500, 800, 2000],
  hideout: { x: -130, z: -116, r: 6 },
  chopshop: { x: 120, z: 100, r: 8 },
  bank: { x: -26, z: -42, r: 8 },
  vaultHold: 3,
};
export const SPAWN = { x: 0, z: 8 };
export const PALETTE = {
  sky: 0x0b1026, ground: 0x14161c, road: 0x1e212b, sidewalk: 0x2a2e3a,
  neonPink: 0xff2d78, neonCyan: 0x00e5ff, neonYellow: 0xffd400, neonPurple: 0x9b5cff,
};
export const COLORS = { player: 0x00e5ff, police: 0x2244ff, ped: [0xffb74d, 0x81c784, 0xe57373, 0xba68c8, 0xfff176] };
