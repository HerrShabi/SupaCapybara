// The saved game lives in the browser (localStorage), so it's still there tomorrow.

import { STARTING_CHARACTERS } from './characters.js';
import { isTouchDevice } from './touch.js';

const STORAGE_KEY = 'supercapybara-save-v1';

function newSave() {
  return {
    bolts: 0,
    keys: [], // e.g. 'world1' after beating Pizza Boss
    owned: [...STARTING_CHARACTERS],
    powerUps: [],
    selected: 'supa-capybara',
    language: 'en', // 'en' or 'de'
    difficulty: 'medium', // see difficulty.js
    muted: false,
    touch: isTouchDevice(), // show on-screen buttons (iPad/iPhone)
    world: 1, // which world PLAY starts ('rush' = Boss Rush)
    palette: 0, // secret colors (see art/heroes.js)
    hats: [], // hats found in ADVENTURE chests
    wearing: {}, // which hat each hero wears: { heroId: hatId }
    adventure: { opened: [], superBossBeaten: false }, // ADVENTURE progress
  };
}

export function loadSave() {
  try {
    return { ...newSave(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return newSave();
  }
}

export function writeSave(save) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

// RESET on the title screen: start the whole game over (bolts, keys, heroes, power-ups),
// but keep the settings (language, sound, touch buttons).
export function resetSave() {
  const { language, muted, touch } = loadSave();
  writeSave({ ...newSave(), language, muted, touch });
}
