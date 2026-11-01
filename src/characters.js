// Every hero you can pick, and every power-up in the shop. Ideas are Ethan's (see GAME_DESIGN.md).
// Words the player sees (hero names, power descriptions, power-up names) are in i18n.js.
//
// attack: what X does. 'laser' | 'superLaser' | 'scratch' | 'tongue' | 'moon' | 'goldLaser'
// secret: the card only shows up once unlockKey is yours (and then you own the hero)
// unlockKey: the boss key you need before the hero can be bought.

export const CHARACTERS = [
  {
    id: 'supa-capybara',
    attack: 'laser',
  },
  {
    id: 'supa-cat',
    attack: 'scratch',
    doubleJump: true,
  },
  {
    id: 'supa-chameleon',
    attack: 'tongue',
    invisibility: true,
  },
  {
    id: 'ultra-capybara',
    attack: 'superLaser',
    fireAura: true,
    price: 2000,
    unlockKey: 'world1',
  },
  {
    id: 'bloodmoon-cat',
    attack: 'moon',
    shadow: true,
    price: 3000,
    unlockKey: 'world2',
  },
  {
    // Secret: unlocked (for free) by beating the Lava Dragon. Has lots of powers at once.
    id: 'golden-capybara',
    attack: 'goldLaser',
    attacks: ['goldLaser', 'scratch'], // Q switches between them
    doubleJump: true,
    fireAura: true,
    auraColor: 0xffd54f, // used in 3D; the 2D aura is the 'aura-gold' texture
    auraTexture: 'aura-gold',
    shadow: true,
    unlockKey: 'world3',
    secret: true,
  },
];

export const STARTING_CHARACTERS = ['supa-capybara', 'supa-cat', 'supa-chameleon'];

// Which boss gives which key. Boss names are in i18n.js as 'boss.<key id>'.
export const KEYS = [{ id: 'world1' }, { id: 'world2' }, { id: 'world3' }];

// ready: it works and can be bought. The others are still being decided with Ethan.
// needs: another power-up you must own before you can buy this one.
export const POWER_UPS = [
  { id: 'shield', price: 500, ready: true },
  { id: 'multi-direction', price: 650, ready: true, needs: 'shield' },
  { id: 'fly', price: 800, ready: true },
  { id: 'double', price: 1000, ready: true },
  { id: 'freeze', price: 1200, ready: true },
  { id: 'mecha-capybara', price: 1750, ready: true },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
