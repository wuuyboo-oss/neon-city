// Neon Harbor — tuning constants, palette and world layout.
// One place for every number the rest of the game reads, so balancing
// the city, the cars, the police and the missions means editing here.

export const WORLD = {
  // City grid: 7 x 7 blocks, roads every 52 units, road width 12.
  blockSize: 40,
  roadWidth: 12,
  roadPitch: 52,
  blocks: 7,
  // Half-extent of the drivable city (roads run -156 .. 156).
  cityHalf: 182,
  // The harbor water starts here (south edge, +z) and the docks sit on it.
  waterStart: 196,
  waterEnd: 320,
  // Key places (x, z) on the map. Block centers sit 26 units off the
  // roads, so every landmark below is on a block or on a road, never
  // inside a building.
  hideout: { x: -130, z: -130 },
  hospital: { x: 130, z: 130 },
  docks: { x: 26, z: 182 },
  bank: { x: -26, z: -26 },
  plaza: { x: 26, z: 26 },
  pier: { x: 78, z: 190 },
};

export const PALETTE = {
  sky: 0x8ec9e8,
  fog: 0xa8c8dc,
  sun: 0xffe3b3,
  ground: 0x9c8f7a,
  road: 0x33373d,
  roadLine: 0xd8c95a,
  sidewalk: 0xb0a894,
  water: 0x1f7fa8,
  sand: 0xd9c08a,
  // Pastel Miami-style building faces.
  buildings: [0xf2d8b3, 0xf6b8a0, 0xa8d8d0, 0xf2e6c8, 0xd8b8d8, 0xb8d8a8, 0xf0a8a8],
  carColors: [0xd83a2e, 0x2e6fd8, 0xf2c230, 0x30b06a, 0xe8e8e8, 0x222226, 0x7a4fd0, 0xe07a28],
  policeWhite: 0xf0f0f0,
  policeBlack: 0x1a1a22,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  radius: 0.6,
  health: 100,
  jumpSpeed: 7,
  punchDamage: 25,
  punchRange: 2.4,
  pistolDamage: 34,
  pistolRange: 90,
  magazine: 12,
  reloadSeconds: 1.6,
};

export const CAR = {
  maxSpeed: 30, // m/s, about 108 km/h
  reverseSpeed: 10,
  accel: 14,
  brake: 30,
  steerRate: 1.9, // rad/s at full lock, scaled by speed
  grip: 6.0,
  radius: 2.1,
  health: 100,
  trafficSpeed: 9,
  policeSpeed: 31, // a touch faster than the player's car, but clumsier in turns
};

export const WANTED = {
  max: 5,
  decaySeconds: 18, // quiet seconds before one star fades
  stealCar: 1,
  hitPedestrian: 1,
  shoot: 1,
  killPedestrian: 2,
  policePerStar: 1, // police cars chasing per star (cap 4)
};

export const MISSIONS = {
  pickupReward: 500,
  getawayReward: 800,
  bankReward: 2000,
  robSeconds: 5,
  pickupCash: 50,
};
