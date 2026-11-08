// The saved game lives in the browser (localStorage), so it's still there tomorrow.
// ACCOUNTS (Ethan's design, 2026-11-08): up to 4 players on one device, each with their own save. The list is
// stored under ACCOUNTS_KEY; loadSave()/writeSave() always use the current account's save. The first account
// ('main') keeps the save from before accounts existed (STORAGE_KEY), so nobody loses their progress.

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
    dances: [], // win dances bought in the wardrobe
    dancing: {}, // which dance each hero does: { heroId: danceId } (none picked = a random one you own)
    crashSeen: false, // after the first rocket crash in World 3, ESC skips it
    tips: 'excited', // Baby Capybara's tips: 'excited', 'professor', 'baby', or null = off (see tips.js)
    tipsSeen: [], // tips he already gave (each one shows once)
    titleHero: 'supa-capybara', // the hero flying across the title screen
    adventure: { opened: [], superBossBeaten: false }, // ADVENTURE progress
  };
}

const ACCOUNTS_KEY = 'supercapybara-accounts';
export const MAX_ACCOUNTS = 4;

const saveKey = (id) => (id === 'main' ? STORAGE_KEY : `${STORAGE_KEY}~${id}`);

// { current: id, list: [{ id, name, hero }] } (hero = the hero picture on the WHO'S PLAYING? screen)
export function loadAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
    if (accounts?.list?.length) {
      if (!accounts.list.some((a) => a.id === accounts.current)) accounts.current = accounts.list[0].id;
      return accounts;
    }
  } catch {}
  // No accounts yet: the save from before accounts is Ethan's
  const name = localStorage.getItem(STORAGE_KEY) ? 'Ethan' : 'Player 1';
  return { current: 'main', list: [{ id: 'main', name, hero: 'supa-capybara' }] };
}

function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function currentAccount() {
  const accounts = loadAccounts();
  return accounts.list.find((a) => a.id === accounts.current);
}

export function switchAccount(id) {
  const accounts = loadAccounts();
  accounts.current = id;
  writeAccounts(accounts);
}

// A new player with a fresh save (keeping this device's language, sound and touch buttons). Returns its id.
export function addAccount(name, hero) {
  const accounts = loadAccounts();
  if (accounts.list.length >= MAX_ACCOUNTS) return null;
  const { language, muted, touch } = loadSave();
  const id = `p${Date.now().toString(36)}`;
  accounts.list.push({ id, name, hero });
  writeAccounts(accounts);
  localStorage.setItem(saveKey(id), JSON.stringify({ ...newSave(), language, muted, touch }));
  return id;
}

export function changeAccount(id, changes) {
  const accounts = loadAccounts();
  Object.assign(accounts.list.find((a) => a.id === id), changes);
  writeAccounts(accounts);
}

// Deletes the player and their save. The last player can't be deleted.
export function deleteAccount(id) {
  const accounts = loadAccounts();
  if (accounts.list.length <= 1) return;
  accounts.list = accounts.list.filter((a) => a.id !== id);
  if (accounts.current === id) accounts.current = accounts.list[0].id;
  writeAccounts(accounts);
  localStorage.removeItem(saveKey(id));
}

export function loadSave() {
  try {
    return { ...newSave(), ...JSON.parse(localStorage.getItem(saveKey(loadAccounts().current))) };
  } catch {
    return newSave();
  }
}

export function writeSave(save) {
  localStorage.setItem(saveKey(loadAccounts().current), JSON.stringify(save));
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
