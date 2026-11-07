// THE BAD GUY KING: the big story mode (Ethan's round 6 design, see GAME_DESIGN.md).
// The crocodile Bad Guy King turned your friends into trophies. You start alone as SuperCapybara, walk around
// the big 3D map (StoryMapWorld) to the places, and play each place as a side-scroller. At the end of a place,
// an evil robot copy of a friend guards their trophy: beat it, and that friend joins your team.
// Before each place you pick 2 heroes from your team and switch between them in the level.
//
// Progress is save.story: { introSeen (the opening movie), saved: [heroIds on your team], freed: [place ids beaten], lastPlace }.

import { writeSave } from '../save.js';

export const STORY_START_HERO = 'supa-capybara';

// The places on the map: where the gate is, which friend is a trophy there, and the scene that plays it.
// ready: false = still being built ("coming soon").
export const PLACES = [
  { id: 'cloud', x: -30, z: 82, friend: 'supa-cat', scene: 'StoryCloud', color: 0xffffff, ready: true },
  { id: 'underwater', x: 8, z: 100, friend: 'supa-chameleon', color: 0x29b6f6, ready: false },
  { id: 'jungle', x: -70, z: 96, friend: 'ultra-capybara', color: 0x2e7d32, ready: false },
];

export function storyProgress(save) {
  const story = (save.story ??= {});
  story.saved ??= [STORY_START_HERO];
  story.freed ??= [];
  return story;
}

// You beat the robot copy: the friend joins your team.
export function freeFriend(save, place) {
  const story = storyProgress(save);
  if (!story.freed.includes(place.id)) story.freed.push(place.id);
  if (!story.saved.includes(place.friend)) story.saved.push(place.friend);
  writeSave(save);
}
