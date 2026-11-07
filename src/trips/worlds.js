// The trips between STORY's worlds (Ethan's round 10 design): after you beat a world, a little mini game takes
// you to the next one, and you go straight into it. You can't fail a trip: mistakes only cost bolts.
// Each trip plays every time; after you've seen it once, ESC (or ⏸ on iPad) skips it (save.tripsSeen).
// The trip scenes are in TripScenes.js (the shared parts in TripScene.js).
//
// World 1 → 2 is World 1's rocket and World 2 → 3 is World 2's rocket crash (those live in the worlds).

import { writeSave } from '../save.js';

// Worlds 4 to 8 are THE BAD GUY KING's places as normal levels (src/story/).
export const WORLD_SCENES = { 1: 'World1', 2: 'World2', 3: 'World3', 4: 'StoryCloud', 5: 'StoryUnderwater', 6: 'StoryJungle', 7: 'StoryCastle', 8: 'StoryKing' };
export const WORLD_COUNT = 8;

// After world `from`: which trip scene plays
export const TRIPS = {
  3: 'TripBalloon',
  4: 'TripRainbow',
  5: 'TripSurf',
  6: 'TripMine',
  7: 'TripStairs',
};

// Start world `number` with this hero (worlds 4+ are story places, which need { world, heroes }).
export function startWorld(scene, number, hero) {
  if (number <= 3) scene.scene.start(WORLD_SCENES[number], {});
  else scene.scene.start(WORLD_SCENES[number], { world: number, heroes: [hero] });
}

// After beating world `from`: its trip (which then starts the next world). After the last world: the YOU WIN
// credits the first time (firstTime), otherwise the menu.
export function afterWorld(scene, from, hero, firstTime = false) {
  const trip = TRIPS[from];
  if (trip) scene.scene.start(trip, { from, hero });
  else if (from === WORLD_COUNT && firstTime) scene.scene.start('Ending', {});
  else scene.scene.start('Menu');
}

export function markTripSeen(save, from) {
  save.tripsSeen ??= [];
  if (!save.tripsSeen.includes(from)) save.tripsSeen.push(from);
  writeSave(save);
}
