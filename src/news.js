// WHAT'S NEW (Ethan, 2026-11-21): the news on the title screen's 📰 button, newest first.
// Each item: `id` (its text is news.<id>.title / news.<id>.text in i18n.js), and either `heroes` (hero pictures)
// or `emoji`. To add news: put a new item at the TOP. The red dot shows until the player has seen the top item
// (or while there are new trophies, see trophies.js).

import { newTrophies } from './trophies.js';

export const NEWS = [
  { id: 'garage', emoji: '🔧' }, // CAPY CIRCUIT's garage (2026-11-22)
  { id: 'capyCircuit', emoji: '🏁' }, // CAPY CIRCUIT is here (2026-11-22)
  { id: 'piano', emoji: '🎹' },
  { id: 'pets', emoji: '🐶' },
  { id: 'trophies', emoji: '🏆' },
  { id: 'teamSpace', heroes: ['supa-capybara', 'supa-cat'] },
  { id: 'supaTiger', heroes: ['supa-tiger'] },
  { id: 'fireworks', emoji: '🎆' },
  { id: 'captainWaddle', heroes: ['captain-waddle'] },
  { id: 'agentWhiskers', heroes: ['agent-whiskers'] },
  { id: 'fbiChameleon', heroes: ['fbi-chameleon'] },
  { id: 'copybara', heroes: ['copybara'] },
];

// save.newsSeen: the id of the newest item the player has seen.
export function hasUnreadNews(save) {
  return save.newsSeen !== NEWS[0].id || newTrophies(save);
}

export function markNewsRead(save) {
  save.newsSeen = NEWS[0].id;
}
