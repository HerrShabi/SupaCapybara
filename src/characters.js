// Every hero you can pick, and every power-up in the shop. Ideas are Ethan's (see GAME_DESIGN.md).
// Words the player sees (hero names, power descriptions, power-up names) are in i18n.js.
//
// attack: what X does. 'laser' | 'superLaser' | 'scratch' | 'tongue' | 'moon' | 'goldLaser' | 'cuffs' | 'snowball' | 'gadget'
// secret: the card only shows up once unlockKey is yours (and then you own the hero)
// unlockKey: the boss key you need before the hero can be bought.
// jailed: not bought; you free him from the police station's jail cell in World 1 (World1Scene, a boss key opens it).
// hidden: not bought; she hides in a cardboard box on a secret planet in World 2 (SpaceWorld.createAgentBox).
// grapple: the double jump throws a grappling hook (Player.grappleFlick).
// slide: C does the WADDLE SLIDE (a belly slide that knocks over bad guys, see Player.startSlide).

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
    // COPYBARA (Ethan's drawing, concept-art/hero-copybara.jpeg): a cop capybara with a gold badge.
    // X throws HANDCUFFS: the bad guy they hit gets locked up and goes POOF to jail.
    id: 'copybara',
    attack: 'cuffs',
    price: 2000,
    unlockKey: 'world1',
  },
  {
    // CAPTAIN WADDLE (Ethan's design, 2026-11-13): a penguin with an orange cape. X throws snowballs, he flaps
    // his wings for a double jump, and C is the WADDLE SLIDE. Copybara locked him up by mistake (black and white,
    // like the bad guys!): free him from the jail in World 1's police station with any boss key.
    id: 'captain-waddle',
    attack: 'snowball',
    doubleJump: true,
    slide: true,
    jailed: true,
  },
  {
    // AGENT WHISKERS (Ethan's design, 2026-11-13): a secret agent cat in a black suit, sunglasses and a pink tie.
    // X throws SPY GADGETS that explode a moment after they land; the double jump is a grappling hook. No C move.
    // She hides in a wobbly cardboard box on a little secret planet in World 2: touch or hit it to find her.
    id: 'agent-whiskers',
    attack: 'gadget',
    doubleJump: true,
    grapple: true,
    hidden: true,
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
// Worlds 4-8 are THE BAD GUY KING's places, played one after another (see WORLD_SCENES in MenuScene).
export const KEYS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `world${n}` }));

// ready: it works and can be bought. The others are still being decided with Ethan.
// needs: another power-up you must own before you can buy this one.
// usedUp: you don't keep it; each one you buy is used up (counted in save[stock], at most `most`; one buys `pack` of them).
export const POWER_UPS = [
  { id: 'shield', price: 500, ready: true },
  { id: 'multi-direction', price: 650, ready: true, needs: 'shield' },
  { id: 'fly', price: 800, ready: true },
  { id: 'double', price: 1000, ready: true },
  { id: 'freeze', price: 1200, ready: true },
  { id: 'mecha-capybara', price: 1750, ready: true },
  { id: 'mega-beam', price: 1000, ready: true, usedUp: true, stock: 'megaBeams', most: 9 }, // see megaBeam.js
  { id: 'supa-sniper', price: 1500, ready: true }, // see supaSniper.js
  { id: 'sniper-ammo', price: 100, ready: true, usedUp: true, stock: 'sniperAmmo', pack: 5, most: 50, needs: 'supa-sniper' },
];

// Win dances: after beating a boss, your hero dances before the key drops. Bought and picked in the wardrobe.
// Names are in i18n.js as 'dance.<id>'. Which hero does which is save.dancing[heroId].
export const DANCES = [
  { id: 'wiggle', price: 50, icon: '🤪' },
  { id: 'bunny', price: 50, icon: '🐰' },
  { id: 'flip', price: 50, icon: '🤸' },
];

// The dance this hero does: the one picked in the wardrobe, or a random one you own. null if you own none.
export function pickDance(save, heroId) {
  const owned = save.dances ?? [];
  const chosen = save.dancing?.[heroId];
  if (chosen && owned.includes(chosen)) return chosen;
  return owned.length ? owned[Math.floor(Math.random() * owned.length)] : null;
}

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
