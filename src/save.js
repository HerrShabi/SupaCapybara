// The saved game lives in the browser (localStorage), so it's still there tomorrow.

import { STARTING_CHARACTERS } from './characters.js';
import { isTouchDevice } from './touch.js';
import { FOOD_COLORS, TEAM_SIZE } from './quest/map.js';

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

// CUBE ISLANDS progress: { food: { color: count }, babies: [{ animal, color, xp, team }], dragonBeaten }.
// It lives here because World 2's alien spaceship gives babies too. Older saves get the newer fields filled in.
export function questProgress(save) {
  const quest = (save.quest ??= { food: {}, babies: [], dragonBeaten: false });
  for (const color of FOOD_COLORS) quest.food[color] ??= 0;
  const hadTeams = quest.babies.some((b) => b.team !== undefined);
  quest.babies.forEach((baby, i) => {
    baby.xp ??= 0;
    if (!hadTeams) baby.team = i < TEAM_SIZE;
  });
  return quest;
}

// A new baby joins the team if there's room (or waits at base camp).
export function addBaby(save, animal, color) {
  const quest = questProgress(save);
  const baby = { animal, color, xp: 0, team: quest.babies.filter((b) => b.team).length < TEAM_SIZE };
  quest.babies.push(baby);
  writeSave(save);
  return baby;
}

// RESET on the title screen: start the whole game over (bolts, keys, heroes, power-ups),
// but keep the settings (language, sound, touch buttons).
export function resetSave() {
  const { language, muted, touch } = loadSave();
  writeSave({ ...newSave(), language, muted, touch });
}
