// Baby Capybara's tips for new players. He shows up the first time you meet something new,
// stands next to it, points at it and says the tip in a comic speech bubble while the game is frozen.
// Each tip shows once (save.tipsSeen). save.tips is how he talks ('excited', 'professor', 'baby') or null = off.
// The words are in i18n.js as 'tip.<id>.<style>'.
// The 2D helper (World 1 and 3) is in SideScrollerScene (showTip), the 3D one in world2/SpaceWorld.js.

import { writeSave } from './save.js';
import { t } from './i18n.js';

export const TIP_STYLES = ['excited', 'professor', 'baby'];

// How long a tip must be on screen before a button press closes it (so a held jump doesn't skip it).
export const TIP_MIN_MS = 600;

export function tipWanted(save, id) {
  return Boolean(save.tips) && !(save.tipsSeen ?? []).includes(id);
}

export function markTipSeen(save, id) {
  save.tipsSeen ??= [];
  if (!save.tipsSeen.includes(id)) save.tipsSeen.push(id);
  writeSave(save);
}

export function tipText(save, id) {
  return t(`tip.${id}.${save.tips}`);
}
