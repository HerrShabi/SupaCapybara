import { sendKey } from './touch.js';

// Game controller → keyboard, for the screens that only listen for keys: the menus and the 3D worlds
// (Adventure, World 2, Quest). Like the touch buttons, it presses the same keys as the keyboard.
// The 2D levels read the controller themselves (controls.js), so it stays quiet there.
// Tested with the ANBERNIC RG 477V. Its buttons use the "standard" layout: A = bottom, B = right.

// The same buttons as the 2D levels (see PAD in controls.js)
const BUTTON_KEYS = {
  0: 'Space', // A: jump (and pick in menus)
  1: 'KeyX', // B: attack
  2: 'KeyX', // X: attack
  3: 'KeyC', // Y: invisible / shadow
  4: 'KeyV', // L1: shield
  5: 'KeyF', // R1: fly
  6: 'KeyR', // L2: Mecha
  7: 'KeyQ', // R2: switch attack
  8: 'Escape', // SELECT: back / menu
  9: 'Enter', // START
  10: 'KeyZ', // press the left stick: Freeze Ray
  12: 'ArrowUp',
  13: 'ArrowDown',
  14: 'ArrowLeft',
  15: 'ArrowRight',
};
const STICK = 0.5;

// isQuiet(): true while a scene reads the controller by itself.
export function startGamepadKeys(isQuiet) {
  const held = new Set();
  const poll = () => {
    requestAnimationFrame(poll);
    const pad = navigator.getGamepads?.().find(Boolean);
    const wanted = new Set();
    if (pad && !isQuiet()) {
      for (const [index, code] of Object.entries(BUTTON_KEYS)) {
        const button = pad.buttons[index];
        if (button && (button.pressed || button.value > 0.5)) wanted.add(code);
      }
      const [x = 0, y = 0] = pad.axes;
      if (x < -STICK) wanted.add('ArrowLeft');
      if (x > STICK) wanted.add('ArrowRight');
      if (y < -STICK) wanted.add('ArrowUp');
      if (y > STICK) wanted.add('ArrowDown');
    }
    for (const code of wanted) if (!held.has(code)) sendKey('keydown', code);
    for (const code of held) if (!wanted.has(code)) sendKey('keyup', code);
    held.clear();
    for (const code of wanted) held.add(code);
  };
  requestAnimationFrame(poll);
}
