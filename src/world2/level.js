// World 2 layout: little planets in space. You travel from planet to planet, find a crystal on each,
// and when you have them all, the force field around Grape Boss's planet goes away.
//
// Directions ("dir") are points on a planet: a direction from its center, e.g. [0, 1, 0] = the top.

export const PLANETS = [
  { id: 'p1', center: [0, 0, 0], radius: 8, color: 0x9e9e9e, spawn: [0, 1, 0], crystal: [-0.5, 0.6, 0.6] },
  { id: 'p2', center: [3, 2, -20], radius: 6, color: 0xff8a65, spawn: [0, 1, 0.3], crystal: [0.8, 0.2, -0.5] },
  { id: 'p3', center: [-2, 5, -39], radius: 7, color: 0x4fc3f7, spawn: [0, 1, 0.3], crystal: [-0.9, -0.2, 0] },
  { id: 'p4', center: [2, 3, -58], radius: 6, color: 0xba68c8, spawn: [0, 1, 0.3], crystal: [0.3, -0.9, 0.2] },
  // Grape Boss's planet and the two moons he jumps between
  { id: 'boss', center: [0, 4, -80], radius: 10, color: 0x7e57c2, spawn: [0, 0.4, 1], boss: true },
  { id: 'moon1', center: [-18, 6, -86], radius: 3.5, color: 0xbdbdbd, spawn: [0, 1, 0], boss: true },
  { id: 'moon2', center: [17, 2, -88], radius: 3.5, color: 0xbdbdbd, spawn: [0, 1, 0], boss: true },
];

export const START_PLANET = 'p1';
export const FORCE_FIELD_RADIUS = 14; // around the boss planet, until you have every crystal

// Yellow jump rings: stand on one and jump to fly to the next planet. [from, to]
export const JUMPS = [
  ['p1', 'p2'],
  ['p2', 'p3'],
  ['p3', 'p4'],
  ['p4', 'boss'],
  ['boss', 'moon1'],
  ['boss', 'moon2'],
  ['moon1', 'boss'],
  ['moon2', 'boss'],
];

// Bolts in a ring around a planet: [planet, howMany, tilt of the ring]
export const BOLT_RINGS = [
  ['p1', 6, [1, 0, 0.3]],
  ['p2', 4, [0, 0, 1]],
  ['p3', 5, [1, 0.2, 0]],
  ['p4', 5, [0.3, 0, 1]],
];

// Bad guys: [kind, planet, dir]. Robots walk around their planet.
export const BAD_GUYS = [
  ['sunglasses', 'p1', [0, 0.75, -0.65]],
  ['apple', 'p1', [0.6, -0.2, 0.75]],
  ['robot', 'p2', [0, 1, -0.4]],
  ['apple', 'p2', [-0.9, 0.2, -0.2]],
  ['sunglasses', 'p3', [0.3, 1, 0.2]],
  ['robot', 'p3', [-0.6, 0.4, -0.7]],
  ['apple', 'p3', [0.8, -0.3, -0.4]],
  ['robot', 'p4', [0, 1, 0]],
  ['sunglasses', 'p4', [-0.7, 0.3, -0.6]],
];
