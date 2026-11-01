// CUBE ISLANDS: Ethan's "Pokémon Quest" world (see GAME_DESIGN.md). You get here through a secret portal in World 1.
// - Base camp: the cooking pot, launch pads to the mission islands, the team tent and the food shop.
// - Each mission island has food to find, and its own bad guys who drop food. Food's color decides the baby you cook.
// - Dragon Island: the Block Dragon sleeps there. The first time you beat him, the babies in his cages are free.
//   After that he comes back for rematches, with a small chance of dropping a rainbow egg.
//
// The ground is made of 2x2 blocks (CELL). Positions on an island are [dx, dz] from its center (y is up).

export const CELL = 2;
export const WATER_Y = -0.6;
export const FOOD_PER_BABY = 3;
export const TEAM_SIZE = 3; // babies that follow you; the rest wait at base camp
export const FOOD_COLORS = ['red', 'blue', 'yellow', 'green', 'pink', 'purple'];
export const RAINBOW_EGG_CHANCE = 0.25; // per dragon rematch
// The food shop sells the foods that don't grow on any island: [color, price in bolts]
export const SHOP = [
  ['green', 15],
  ['purple', 15],
];

// hills: how bumpy (0 = flat). ground: the grass color. badGuys: [dx, dz, kind] (kinds: robot, crab, snowman,
// lizard, gummy, flyer). foodColors: what the bad guys drop. pads: [dx, dz, target island].
// start: where you arrive, facing: which way you look. Pads and the start are kept flat.
export const ISLANDS = {
  base: {
    x: 0,
    z: 0,
    radius: 17,
    hills: 0,
    seed: 0,
    start: [0, 9],
    facing: [0, -1],
    pot: [0, -1],
    tent: [-9, 4],
    shop: [9, 4],
    pads: [
      [-10, -6, 'beach'],
      [-4, -12, 'forest'],
      [4, -12, 'candy'],
      [10, -6, 'dragon'],
    ],
    trees: [[-5, 13], [6, 13], [-13, -1], [13, -1]],
    food: [],
    badGuys: [],
    foodColors: [],
  },
  beach: {
    x: 220,
    z: 0,
    radius: 26,
    hills: 1,
    seed: 1,
    start: [0, 13],
    facing: [0, -1],
    pads: [[7, 18, 'base']],
    trees: [[-10, 4], [12, -2], [-4, -14], [8, -16], [-16, -6], [16, 10]],
    food: [[-6, 8, 'red'], [6, 6, 'yellow'], [-12, -2, 'red'], [10, -8, 'yellow'], [0, -4, 'red'], [-8, -16, 'yellow'], [14, 2, 'red'], [2, -18, 'yellow']],
    badGuys: [[4, 0, 'crab'], [-10, -10, 'crab'], [10, -14, 'crab'], [-14, 6, 'crab']],
    foodColors: ['red', 'yellow'],
  },
  forest: {
    x: 0,
    z: 240,
    radius: 28,
    hills: 2,
    seed: 3,
    ground: 0x388e3c,
    start: [0, 15],
    facing: [0, -1],
    pads: [[7, 20, 'base']],
    trees: [[-8, 10], [8, 12], [-14, 0], [14, -2], [-6, -6], [6, -10], [-16, -12], [16, -14], [0, -20], [-10, -20], [10, 2]],
    food: [[-4, 8, 'blue'], [4, 4, 'blue'], [-12, 6, 'red'], [12, 6, 'blue'], [0, -4, 'blue'], [-10, -14, 'blue'], [12, -10, 'red'], [4, -18, 'blue']],
    badGuys: [[0, 2, 'snowman'], [-10, -8, 'snowman'], [10, -6, 'snowman'], [0, -14, 'snowman']],
    foodColors: ['blue', 'blue', 'red'],
  },
  candy: {
    x: 0,
    z: -240,
    radius: 24,
    hills: 1,
    seed: 7,
    ground: 0xf8bbd0,
    sand: 0xfff0f6,
    lollipops: true,
    start: [0, 12],
    facing: [0, -1],
    pads: [[7, 17, 'base']],
    trees: [[-9, 6], [10, 4], [-12, -8], [12, -10], [0, -16], [-4, 14]],
    food: [[-5, 6, 'pink'], [5, 2, 'pink'], [-10, -2, 'pink'], [9, -4, 'pink'], [0, -8, 'pink'], [-6, -14, 'pink'], [6, -14, 'pink']],
    badGuys: [[3, -2, 'gummy'], [-8, -6, 'gummy'], [8, -10, 'gummy'], [-2, -12, 'gummy'], [-10, 8, 'gummy']],
    foodColors: ['pink'],
  },
  dragon: {
    x: -240,
    z: 0,
    radius: 34,
    hills: 1,
    seed: 5,
    ground: 0x689f38,
    start: [0, 22],
    facing: [0, -1],
    pads: [[7, 27, 'base']],
    nest: [0, -8], // where the Block Dragon sleeps
    cages: [[-7, -21], [0, -24], [7, -21]],
    trees: [[-18, 10], [18, 10], [-24, -4], [24, -4], [-14, 20], [14, 20]],
    food: [[-8, 16, 'red'], [8, 16, 'blue'], [-16, 2, 'yellow'], [16, 2, 'red'], [-4, 20, 'yellow'], [4, 20, 'blue']],
    badGuys: [[-8, 10, 'lizard'], [8, 10, 'lizard'], [-16, -6, 'lizard'], [16, -6, 'lizard'], [-10, 2, 'flyer'], [10, 2, 'flyer']],
    foodColors: ['red', 'blue', 'yellow'],
  },
};

// The babies in the dragon's cages. Beat him the first time and they join your team.
export const CAGED_BABIES = [
  { animal: 'cat', color: 'red' },
  { animal: 'capybara', color: 'blue' },
  { animal: 'cat', color: 'yellow' },
];
