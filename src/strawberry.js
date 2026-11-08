import { writeSave } from './save.js';
import { audio } from './audio.js';
import { t } from './i18n.js';

// THE MAGIC STRAWBERRY (Ethan's mom's idea, designed by Ethan 2026-11-08). The secret capybara disco
// (disco.js) gives you one: a GOLDEN one the first time in each world, a normal one after that.
// They wait in your bag (save.strawberries, up to 3, kept forever) until you eat one (B / START / 🍓).
// Then your hero turns rainbow, runs super fast, nothing can hurt you, and touching bad guys pops them,
// for as long as the magic strawberry song plays (15 seconds, golden 30). The song speeds up near the end.
// Works everywhere you play a hero, except 2 PLAYERS BATTLE (and TEAM, where power-ups are off).
//
// A world keeps a Magic: magic = new Magic(), magic.start(gold, now), magic.update(now) every frame,
// magic.active(now). The bag helpers work on the save.

export const BAG_SIZE = 3;
export const MAGIC_MS = 15000;
const HURRY_MS = 3500; // the song speeds up for the last few seconds
export const MAGIC_SPEED = 1.6; // how much faster you run

export function strawberryBag(save) {
  return (save.strawberries ??= []);
}

// After a disco party in world `place`: which strawberry you get ('gold', 'red', or 'full' if the bag is full).
export function discoReward(save, place) {
  save.discosFound ??= [];
  const first = !save.discosFound.includes(place);
  if (first) save.discosFound.push(place);
  const bag = strawberryBag(save);
  let reward = 'full';
  if (bag.length < BAG_SIZE) {
    reward = first ? 'gold' : 'red';
    bag.push(reward);
  }
  writeSave(save);
  return reward;
}

// Takes the oldest strawberry out of the bag: 'gold', 'red', or null if the bag is empty.
export function takeStrawberry(save) {
  const bag = strawberryBag(save);
  const berry = bag.shift() ?? null;
  if (berry) writeSave(save);
  return berry;
}

// The bag for the screen, e.g. "B = 🍓🌟"
export function bagText(save) {
  const bag = strawberryBag(save);
  if (!bag.length) return '';
  return `B = ${bag.map((b) => (b === 'gold' ? '🌟' : '🍓')).join('')}`;
}

// The magic itself: the timer and the song. `now` is the world's clock (it stops when the world is frozen).
export class Magic {
  constructor() {
    this.until = 0;
    this.hurrying = false;
    this.songBefore = null;
  }

  active(now) {
    return now < this.until;
  }

  secondsLeft(now) {
    return Math.ceil((this.until - now) / 1000);
  }

  start(berry, now) {
    if (!this.active(now)) this.songBefore = audio.wantedSong;
    this.until = now + MAGIC_MS * (berry === 'gold' ? 2 : 1);
    this.hurrying = false;
    audio.play('key');
    audio.playMusic('strawberry');
  }

  // Call every frame. Returns 'ended' on the frame the magic runs out.
  update(now) {
    if (!this.until) return null;
    // Something else took over the music (a boss fight started): leave it alone
    const ours = audio.wantedSong === 'strawberry' || audio.wantedSong === 'strawberryHurry';
    if (!ours) this.songBefore = null;
    if (now >= this.until) {
      this.until = 0;
      if (ours) {
        if (this.songBefore) audio.playMusic(this.songBefore);
        else audio.stopMusic();
      }
      return 'ended';
    }
    if (ours && !this.hurrying && this.until - now < HURRY_MS) {
      this.hurrying = true;
      audio.playMusic('strawberryHurry');
    }
    return null;
  }

  // Stop right away (the level ends): the strawberry song stops too
  stop() {
    if (this.until && (audio.wantedSong === 'strawberry' || audio.wantedSong === 'strawberryHurry')) audio.stopMusic();
    this.until = 0;
  }
}

// The rainbow color for this moment (for tinting the hero)
export function rainbowColor(now) {
  const hue = (now / 400) % 1;
  const rgb = hslToRgb(hue, 1, 0.6);
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return [f(0), f(8), f(4)];
}

// "No strawberries! Find a secret disco" etc.
export function emptyBagText() {
  return t('strawberry.empty');
}
