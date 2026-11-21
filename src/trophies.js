// TROPHIES (Ethan, 2026-11-21): 27 achievements, like Minecraft's advancements. They're on the WHAT'S NEW page's
// TROPHIES tab, and unlocking one slides a box in at the top corner (a little ding, the game keeps going) and
// gives ⚡ bolts. Texts: trophy.<id>.name, and trophy.<id>.hint for secret ones (shown as "???" + the hint while locked).
//
// Most trophies are checked from the save itself (`has`), every time the game saves (writeSave in save.js calls
// checkTrophies). The ones that happen in the moment (beating a boss without getting hurt, finishing a rush,
// opening the portal) are unlocked by the level with unlockTrophy(save, id).

import { audio } from './audio.js';
import { t } from './i18n.js';

const keyOr = (save, key, place) => save.keys?.includes(key) || save.story?.freed?.includes(place);
// Every place with a secret capybara disco (discoReward's place names)
const DISCO_PLACES = ['World1', 'World2', 'World3', 'StoryCloud', 'StoryUnderwater', 'StoryJungle', 'StoryCastle', 'StoryKing'];

export const TROPHIES = [
  // Bosses
  { id: 'pizza', icon: '🍕', bolts: 100, has: (s) => s.keys?.includes('world1') },
  { id: 'pizzaClean', icon: '🍕', bolts: 300 },
  { id: 'grape', icon: '🍇', bolts: 150, has: (s) => s.keys?.includes('world2') },
  { id: 'grapeClean', icon: '🍇', bolts: 400 },
  { id: 'dragon', icon: '🐉', bolts: 200, has: (s) => s.keys?.includes('world3') },
  { id: 'dragonClean', icon: '🐉', bolts: 500 },
  { id: 'cloud', icon: '☁️', bolts: 200, has: (s) => keyOr(s, 'world4', 'cloud') },
  { id: 'underwater', icon: '🌊', bolts: 200, has: (s) => keyOr(s, 'world5', 'underwater') },
  { id: 'jungle', icon: '🌴', bolts: 200, has: (s) => keyOr(s, 'world6', 'jungle') },
  { id: 'castle', icon: '🏰', bolts: 300, has: (s) => keyOr(s, 'world7', 'castle') },
  { id: 'king', icon: '👑', bolts: 500, has: (s) => s.keys?.includes('world8') || s.story?.kingBeaten },
  { id: 'kingClean', icon: '👑', bolts: 2000, prize: true },
  { id: 'bossRush', icon: '🥊', bolts: 500 },
  { id: 'kingRush', icon: '⚔️', bolts: 1000 },
  { id: 'superBoss', icon: '🦹', bolts: 300, has: (s) => s.adventure?.superBossBeaten },
  { id: 'cubeDragon', icon: '🧊', bolts: 300, has: (s) => s.quest?.dragonBeaten },
  { id: 'monster', icon: '✏️', bolts: 300, has: (s) => s.magicPencil },
  // Secrets
  { id: 'waddle', icon: '🐧', bolts: 150, secret: true, has: (s) => s.owned?.includes('captain-waddle') },
  { id: 'whiskers', icon: '🕶️', bolts: 150, secret: true, has: (s) => s.owned?.includes('agent-whiskers') },
  { id: 'chameleon', icon: '🚐', bolts: 150, secret: true, has: (s) => s.owned?.includes('fbi-chameleon') },
  { id: 'tiger', icon: '🐯', bolts: 150, secret: true, has: (s) => s.owned?.includes('supa-tiger') },
  { id: 'portal', icon: '🌀', bolts: 150, secret: true },
  { id: 'disco', icon: '🪩', bolts: 100, secret: true, has: (s) => (s.discosFound?.length ?? 0) > 0 },
  { id: 'allDiscos', icon: '🪩', bolts: 800, secret: true, has: (s) => DISCO_PLACES.every((place) => s.discosFound?.includes(place)) },
  { id: 'goldBerry', icon: '🍓', bolts: 100, secret: true, has: (s) => (s.discosFound?.length ?? 0) > 0 }, // (the first disco in each world gives a golden one)
  { id: 'alien', icon: '👽', bolts: 150, secret: true, has: (s) => s.quest?.babies?.some((baby) => baby.animal === 'alien') },
  { id: 'secretHeroes', icon: '🦸', bolts: 300, secret: true, has: (s) => s.keys?.includes('world3') },
];

export const hasTrophy = (save, id) => Boolean(save.trophies?.includes(id));

// Unlocks one trophy (once): adds it to save.trophies, gives its bolts and shows the pop-up. The caller saves.
export function unlockTrophy(save, id) {
  if (hasTrophy(save, id)) return false;
  const trophy = TROPHIES.find((x) => x.id === id);
  if (!trophy) return false;
  save.trophies = [...(save.trophies ?? []), id];
  save.bolts = (save.bolts ?? 0) + trophy.bolts;
  toast(trophy);
  return true;
}

// Called by writeSave: unlocks every trophy the save already earned.
export function checkTrophies(save) {
  if (!save || !Array.isArray(save.keys)) return;
  for (const trophy of TROPHIES) if (trophy.has?.(save)) unlockTrophy(save, trophy.id);
}

// Trophies unlocked since the player last looked at the TROPHIES tab (for the red dot)
export function newTrophies(save) {
  return (save.trophies?.length ?? 0) > (save.trophiesSeen ?? 0);
}

// ---------- The pop-up (HTML on top of everything, so it works in the 2D and 3D worlds alike) ----------

const queue = [];
let showing = false;

function toast(trophy) {
  queue.push(trophy);
  if (!showing) setTimeout(next, 50); // (a few at once: they're grouped, see next)
}

function next() {
  if (!queue.length) {
    showing = false;
    return;
  }
  showing = true;
  // Lots at once (an old save getting its trophies): one box that says how many
  const batch = queue.length > 3 ? queue.splice(0) : [queue.shift()];
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:center;gap:12px;min-width:260px;max-width:360px;padding:10px 16px;' +
    'background:#1b1b2f;border:4px solid #ffd23f;border-radius:10px;box-shadow:0 4px 0 #000;color:#fff;font:15px "Arial Black",Arial,sans-serif;' +
    'transform:translateX(120%);transition:transform 0.35s ease-out;pointer-events:none;';
  const bolts = batch.reduce((sum, x) => sum + x.bolts, 0);
  const title = batch.length > 1 ? t('trophy.many', { count: batch.length }) : t(`trophy.${batch[0].id}.name`);
  box.innerHTML = `<div style="font-size:34px">🏆</div><div><div style="color:#ffd23f;font-size:13px"></div><div></div><div style="color:#ffd23f;font-size:13px;margin-top:2px"></div></div>`;
  const [top, name, reward] = box.querySelectorAll('div > div > div');
  top.textContent = t('trophy.unlocked');
  name.textContent = `${batch.length > 1 ? '' : `${batch[0].icon} `}${title}`;
  reward.textContent = `+${bolts} ⚡`;
  document.body.appendChild(box);
  audio.play('crystal');
  requestAnimationFrame(() => requestAnimationFrame(() => (box.style.transform = 'translateX(0)')));
  setTimeout(() => (box.style.transform = 'translateX(120%)'), 3500);
  setTimeout(() => {
    box.remove();
    next();
  }, 3950);
}
