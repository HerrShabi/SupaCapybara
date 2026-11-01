// CUBE ISLANDS: Ethan's "Pokémon Quest" world (see GAME_DESIGN.md). You get here through a secret portal in World 1.
// - Base camp: the cooking pot, and launch pads that send you on missions to the other islands.
// - Each mission island has food to find (and bad guys who drop food). Food's color decides the baby you cook.
// - Dragon Island: the Block Dragon sleeps there, next to the baby cats and capybaras he stole.
//
// The ground is made of 2x2 blocks (CELL). Positions on an island are [dx, dz] from its center (y is up).

export const CELL = 2;
export const WATER_Y = -0.6;
export const FOOD_PER_BABY = 3;
export const TEAM_SIZE = 3; // babies that follow you; the rest wait at base camp
export const FOOD_COLORS = ['red', 'blue', 'yellow'];

// hills: how bumpy (0 = flat). foodColors: what the bad guys drop. pads: [dx, dz, target island].
// start: where you arrive, facing: which way you look. flat: spots kept flat (pads, the dragon's nest).
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
    pads: [
      [-9, -7, 'beach'],
      [0, -12, 'forest'],
      [9, -7, 'dragon'],
    ],
    trees: [[-12, 5], [12, 5], [-5, 13], [6, 13]],
    food: [],
    robots: [],
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
    robots: [[4, 0], [-10, -10], [10, -14]],
    foodColors: ['red', 'yellow'],
  },
  forest: {
    x: 0,
    z: 240,
    radius: 28,
    hills: 2,
    seed: 3,
    start: [0, 15],
    facing: [0, -1],
    pads: [[7, 20, 'base']],
    trees: [[-8, 10], [8, 12], [-14, 0], [14, -2], [-6, -6], [6, -10], [-16, -12], [16, -14], [0, -20], [-10, -20], [10, 2]],
    food: [[-4, 8, 'blue'], [4, 4, 'blue'], [-12, 6, 'red'], [12, 6, 'blue'], [0, -4, 'blue'], [-10, -14, 'blue'], [12, -10, 'red'], [4, -18, 'blue']],
    robots: [[0, 2], [-10, -8], [10, -6], [0, -14]],
    foodColors: ['blue', 'blue', 'red'],
  },
  dragon: {
    x: -240,
    z: 0,
    radius: 34,
    hills: 1,
    seed: 5,
    start: [0, 22],
    facing: [0, -1],
    pads: [[7, 27, 'base']],
    nest: [0, -8], // where the Block Dragon sleeps
    cages: [[-7, -21], [0, -24], [7, -21]],
    trees: [[-18, 10], [18, 10], [-24, -4], [24, -4], [-14, 20], [14, 20]],
    food: [[-8, 16, 'red'], [8, 16, 'blue'], [-16, 2, 'yellow'], [16, 2, 'red'], [-4, 20, 'yellow'], [4, 20, 'blue']],
    robots: [[-8, 10], [8, 10], [-16, -6], [16, -6]],
    foodColors: ['red', 'blue', 'yellow'],
  },
};

// The babies in the dragon's cages. Beat him and they join your team.
export const CAGED_BABIES = [
  { animal: 'cat', color: 'red' },
  { animal: 'capybara', color: 'blue' },
  { animal: 'cat', color: 'yellow' },
];
