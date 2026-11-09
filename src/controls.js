import Phaser from 'phaser';

// Who controls a hero: which keys, and which game controller.
// Actions: left, right, up, down, jump, attack, special (C: invisible/shadow), shield, fly, mecha, swap (Golden Capybara's switch), freeze,
// pencil (the magic pencil from the Drawings World), strawberry (eat a magic strawberry, see strawberry.js), mega (MEGA BEAM, see megaBeam.js), sniper (SUPA SNIPER, see supaSniper.js).
//
// solo: one player. p1 / p2: two players on one keyboard (left side and right side).
// Touch buttons (touch.js) press these same keys, so they work too.

export const SCHEMES = {
  solo: {
    left: ['LEFT', 'A'],
    right: ['RIGHT', 'D'],
    up: ['UP', 'W'],
    down: ['DOWN', 'S'],
    jump: ['SPACE', 'UP', 'W'],
    attack: ['X'],
    special: ['C'],
    shield: ['V'],
    fly: ['F'],
    mecha: ['R'],
    swap: ['Q'],
    freeze: ['Z'],
    pencil: ['E'],
    strawberry: ['B'],
    mega: ['G'],
    sniper: ['T'],
  },
  p1: { left: ['A'], right: ['D'], up: ['W'], down: ['S'], jump: ['W'], attack: ['F'], special: ['G'], shield: [], fly: [], mecha: [], swap: ['T'], freeze: [], pencil: [], strawberry: [], mega: [], sniper: [] },
  p2: {
    left: ['LEFT'],
    right: ['RIGHT'],
    up: ['UP'],
    down: ['DOWN'],
    jump: ['UP'],
    attack: ['ENTER'],
    special: ['SHIFT'],
    shield: [],
    fly: [],
    mecha: [],
    swap: ['BACKSPACE'],
    freeze: [],
    pencil: [],
    strawberry: [],
    mega: [],
    sniper: [],
  },
};

// Game controller buttons for each action (standard layout: A = bottom button).
const PAD = {
  left: (pad) => pad.left || pad.leftStick.x < -0.4,
  right: (pad) => pad.right || pad.leftStick.x > 0.4,
  up: (pad) => pad.up || pad.leftStick.y < -0.4,
  down: (pad) => pad.down || pad.leftStick.y > 0.4,
  jump: (pad) => pad.A,
  attack: (pad) => pad.X || pad.B,
  special: (pad) => pad.Y,
  shield: (pad) => pad.L1 > 0.5,
  fly: (pad) => pad.R1 > 0.5,
  mecha: (pad) => pad.L2 > 0.5,
  swap: (pad) => pad.R2 > 0.5,
  freeze: (pad) => pad.B && pad.Y,
  pencil: (pad) => Boolean(pad.buttons?.[11]?.pressed), // press the right stick
  strawberry: (pad) => Boolean(pad.buttons?.[9]?.pressed), // START
  mega: (pad) => Boolean(pad.buttons?.[10]?.pressed), // press the left stick
  sniper: (pad) => pad.A && pad.Y, // A + Y together
};

export class Controls {
  constructor(scene, scheme = 'solo', padIndex = 0) {
    this.scene = scene;
    this.scheme = SCHEMES[scheme];
    this.padIndex = padIndex;
    const names = [...new Set(Object.values(this.scheme).flat())];
    this.keys = scene.input.keyboard.addKeys(names.join(','));
    this.padWasDown = {};
  }

  get pad() {
    const gamepad = this.scene.input.gamepad;
    return gamepad && gamepad.total > 0 ? gamepad.gamepads[this.padIndex] : null;
  }

  isDown(action) {
    if (this.scheme[action].some((name) => this.keys[name].isDown)) return true;
    const pad = this.pad;
    return Boolean(pad && PAD[action](pad));
  }

  // True only once per press (keyboard taps are never missed, even very quick ones).
  justPressed(action) {
    const keyTapped = this.scheme[action].some((name) => Phaser.Input.Keyboard.JustDown(this.keys[name]));
    const pad = this.pad;
    const padDown = Boolean(pad && PAD[action](pad));
    const padTapped = padDown && !this.padWasDown[action];
    this.padWasDown[action] = padDown;
    return keyTapped || padTapped;
  }
}
