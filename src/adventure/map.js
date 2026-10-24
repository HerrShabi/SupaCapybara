// ADVENTURE: one big 3D world to explore, a mix of the story's places (Ethan's design, see GAME_DESIGN.md).
// - The city (north-west): buildings to climb.
// - The space area (north-east): under a dark "space bubble", with low gravity for moon jumps and floating rocks.
// - The volcano (south-east): a big cone with lava at the top and lava rivers.
// - Grassy hills, trees and caves in between.
// Chests are guarded by bad guys. 6 of them hold puzzle pieces; with all 6, the secret door opens to the SUPER BOSS.
//
// Positions are [x, z] on the ground (y is up). The world goes from -MAP_SIZE to +MAP_SIZE.

export const MAP_SIZE = 120;
export const SPAWN = { x: 0, z: 60, facing: [0, -1] };

export const CITY = { x: -60, z: -45, halfWidth: 42, halfDepth: 42 };
export const SPACE = { x: 62, z: -50, radius: 32 };
export const VOLCANO = { x: 58, z: 58, radius: 42, height: 22, craterRadius: 7 };

// The super boss fights in a round arena, far away from the map (you get there through the secret door).
export const ARENA = { x: 0, z: 320, radius: 26 };
export const DOOR = { x: 0, z: -102 };

// City buildings: [x, z, width, depth, height]. Some are stacked like stairs so you can climb up.
export const BUILDINGS = [
  [-90, -85, 10, 10, 2],
  [-90, -72, 10, 10, 4],
  [-80, -82, 10, 12, 6], // a puzzle piece waits on the roof
  [-55, -85, 14, 10, 5],
  [-30, -88, 12, 10, 8],
  [-95, -45, 10, 14, 6],
  [-70, -50, 12, 12, 3],
  [-45, -50, 10, 10, 7],
  [-25, -45, 8, 14, 4],
  [-85, -18, 12, 10, 5],
  [-50, -15, 10, 8, 3],
  [-30, -20, 12, 10, 6],
];

// Floating rocks in the space area: [x, z, height above the ground, size]
export const FLOATING_ROCKS = [
  [52, -40, 3, 5],
  [47, -33, 6, 4],
  [42, -27, 9, 5], // a puzzle piece waits up here
];

// Lava rivers running down the volcano: [x, z, length, width, angle]
export const LAVA_RIVERS = [
  [58, 30, 26, 3, 0],
  [32, 62, 24, 3, Math.PI / 2],
];

// Caves: a tunnel through rock with a chest inside: [x, z, angle]
export const CAVES = [
  [-92, 62, 0],
  [30, 92, Math.PI / 2],
];

// Treasure chests: { id, x, z, y (height of a roof to sit on) or above (height above the ground), reward, guards: [[kind, dx, dz]] }
// reward: 'piece' | 'bolts' | a hat id
export const CHESTS = [
  { id: 'city-roof', x: -80, z: -82, y: 6, reward: 'piece', guards: [['sunglasses', 3, 2]] },
  { id: 'city-street', x: -38, z: -68, reward: 'piece', guards: [['robot', 4, 0], ['apple', -4, 2]] },
  { id: 'city-crown', x: -62, z: -30, reward: 'crown', guards: [['apple', 3, 3]] },
  { id: 'city-bolts', x: -100, z: -28, reward: 'bolts', guards: [['robot', 3, 0]] },
  { id: 'space-crater', x: 72, z: -68, reward: 'piece', guards: [['robot', 4, 2], ['sunglasses', -3, 3]] },
  { id: 'space-rock', x: 42, z: -27, above: 9, reward: 'piece', guards: [] },
  { id: 'space-wizard', x: 82, z: -38, reward: 'wizard', guards: [['apple', 3, -2]] },
  { id: 'space-bolts', x: 44, z: -66, reward: 'bolts', guards: [['sunglasses', 2, 3]] },
  { id: 'volcano-rim', x: 58, z: 47, reward: 'piece', guards: [['robot', 4, -2]] },
  { id: 'volcano-cave', x: 30, z: 92, reward: 'piece', guards: [['apple', 0, 5]] },
  { id: 'volcano-pirate', x: 92, z: 74, reward: 'pirate', guards: [['robot', -3, 3], ['apple', 3, -3]] },
  { id: 'volcano-bolts', x: 86, z: 30, reward: 'bolts', guards: [['sunglasses', 2, 2]] },
  { id: 'cave-party', x: -92, z: 62, reward: 'party', guards: [['robot', 0, -5]] },
  { id: 'hills-shades', x: 22, z: 28, reward: 'shades', guards: [['apple', 3, 2]] },
  { id: 'hills-bolts', x: -40, z: 42, reward: 'bolts', guards: [['sunglasses', -2, 3]] },
];

export const PIECES_NEEDED = CHESTS.filter((c) => c.reward === 'piece').length;
export const CHEST_BOLTS = 50;
