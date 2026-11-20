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
  //
  // IMPORTANT — these are ENTRANCE points, not building centers. The
  // missions ask the player to get within 6-8 units of them, so each
  // one must be a spot the player can actually stand on:
  //  - hideout: the house itself is at (-130,-130), 14x12, so the
  //    closest a player on foot can get to its CENTER is 6.6 units —
  //    outside the 6-unit goto radius. The target sits 8 units south
  //    of the front door, on open ground by the road.
  //  - bank: the hall is at (-26,-26), 30x20, so the closest approach
  //    to its CENTER is 10.6 units — outside the 8-unit hold radius.
  //    The target sits on the front steps, 6 units north of the face
  //    with the gold sign, facing the road at z=-52.
  // (The buildings themselves are placed in city.js and do not move.)
  hideout: { x: -130, z: -116 },
  hospital: { x: 130, z: 130 },
  docks: { x: 26, z: 182 },
  bank: { x: -26, z: -42 },
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
  // Police top speed 15 — well under the player's 30, so a driver
  // at speed builds distance fast and the heat can actually decay.
  // At 20 the player gained only 8 m/s and the police, who cut
  // corners instead of following roads, never fell 25 units behind
  // for the 12 quiet seconds a star needs — measured over two full
  // escape drives, the wanted level never dropped from 4 and the
  // player was busted at the hideout door. At 15 the gap opens at
  // 13+ m/s on a straight and the police peel off. They still catch
  // a slow or weaving driver, and they ram on contact.
  policeSpeed: 15,
};

export const WANTED = {
  max: 5,
  decaySeconds: 12, // quiet seconds before one star fades. At 18 the
  // bank-job escape (4 stars down to 2) needed 36 quiet seconds with
  // four police converging, which never happened — the heat could not
  // be lost. At 12 it is 24 seconds: still a real chase, but a fast
  // driver who breaks away can actually cool off.
  stealCar: 1,
  hitPedestrian: 1,
  shoot: 1,
  killPedestrian: 2,
  policePerStar: 1, // police cars chasing per star (cap 3)
};

export const MISSIONS = {
  pickupReward: 500,
  getawayReward: 800,
  bankReward: 2000,
  robSeconds: 5,
  pickupCash: 50,
};
