// Draws every hero's frames (idle, run1, run2, jump) and their run animation.
// Texture keys look like 'supa-cat-idle' and the run animation is 'supa-cat-run'.
// With secret colors (palette 1 and up), keys get the palette number: 'supa-cat~2-idle'. Use heroKey() to get the prefix.

import { HERO_WIDTH, HERO_HEIGHT } from './heroParts.js';
import { drawCapybara } from './capybara.js';
import { drawCat } from './cat.js';
import { drawChameleon } from './chameleon.js';

const POSES = {
  idle: { legOffset: 0, capeFlying: false },
  run1: { legOffset: 3, capeFlying: true },
  run2: { legOffset: -3, capeFlying: true },
  jump: { legOffset: 2, capeFlying: true },
};

// Each hero's normal colors.
const HEROES = {
  'supa-capybara': { draw: drawCapybara, suit: 0xd8343f, suitDark: 0x9e1f2a },
  'ultra-capybara': { draw: drawCapybara, suit: 0xe0457b, suitDark: 0xa3204f },
  'golden-capybara': { draw: drawCapybara, suit: 0xffc107, suitDark: 0xff8f00, cape: 0xfff176 },
  'supa-cat': { draw: drawCat, suit: 0xb5452f, suitDark: 0x7f2c1d },
  'bloodmoon-cat': { draw: drawCat, suit: 0x6a1b4d, suitDark: 0x400f2e, fur: 0xf3e5f5 },
  'supa-chameleon': { draw: drawChameleon, suit: 0xf06292, suitDark: 0xf06292 },
};

// Secret colors, unlocked by beating the Lava Dragon. Palette 0 is each hero's normal colors.
export const PALETTES = [
  null,
  { suit: 0x1e88e5, suitDark: 0x0d47a1, cape: 0xffd23f }, // ocean
  { suit: 0x43a047, suitDark: 0x1b5e20, cape: 0xff7043 }, // jungle
  { suit: 0x212121, suitDark: 0x000000, cape: 0xd500f9 }, // night
  { suit: 0xff80ab, suitDark: 0xc2185b, cape: 0x80deea }, // candy
];

export function heroKey(id, palette = 0) {
  return palette ? `${id}~${palette}` : id;
}

export function createHeroTextures(scene, palette = 0) {
  for (const [id, hero] of Object.entries(HEROES)) {
    const colors = { ...hero, ...PALETTES[palette] };
    const prefix = heroKey(id, palette);
    for (const [poseName, pose] of Object.entries(POSES)) {
      const key = `${prefix}-${poseName}`;
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ add: false });
      hero.draw(g, pose, colors);
      g.generateTexture(key, HERO_WIDTH, HERO_HEIGHT);
      g.destroy();
    }
    if (!scene.anims.exists(`${prefix}-run`)) {
      scene.anims.create({
        key: `${prefix}-run`,
        frames: [{ key: `${prefix}-run1` }, { key: `${prefix}-run2` }],
        frameRate: 10,
        repeat: -1,
      });
    }
  }
}
