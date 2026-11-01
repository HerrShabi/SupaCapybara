// On-screen buttons for iPad and iPhone. Each button "presses" the same key as the keyboard,
// so the levels don't need any touch code of their own.

const KEYS = {
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  ArrowUp: { key: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 },
  Space: { key: ' ', keyCode: 32 },
  KeyX: { key: 'x', keyCode: 88 },
  KeyC: { key: 'c', keyCode: 67 },
  KeyV: { key: 'v', keyCode: 86 },
  KeyF: { key: 'f', keyCode: 70 },
  KeyR: { key: 'r', keyCode: 82 },
  KeyQ: { key: 'q', keyCode: 81 },
  KeyZ: { key: 'z', keyCode: 90 },
  Escape: { key: 'Escape', keyCode: 27 },
  // Two players: player 1 uses A D W F G, player 2 uses the arrows, ENTER and SHIFT (see controls.js)
  KeyA: { key: 'a', keyCode: 65 },
  KeyD: { key: 'd', keyCode: 68 },
  KeyW: { key: 'w', keyCode: 87 },
  KeyG: { key: 'g', keyCode: 71 },
  Enter: { key: 'Enter', keyCode: 13 },
  ShiftLeft: { key: 'Shift', keyCode: 16 },
};

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function sendKey(type, code) {
  const { key, keyCode } = KEYS[code];
  const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
  // Phaser reads keyCode, which can't be set in the constructor.
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  Object.defineProperty(event, 'which', { get: () => keyCode });
  window.dispatchEvent(event);
}

const STYLE = `
  .touch { position: absolute; inset: 0; pointer-events: none; z-index: 10; user-select: none; -webkit-user-select: none; }
  .touch button { position: absolute; pointer-events: auto; touch-action: none; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.8); background: rgba(0,0,0,0.35); color: #fff;
    font: 22px 'Arial Black', Arial, sans-serif; text-shadow: 0 0 4px #000; padding: 0; -webkit-tap-highlight-color: transparent; }
  .touch button.held { background: rgba(255,210,63,0.6); }
`;

// buttons: { left, right, up, down, attack, invisible, shield, fly } — which ones to show. `attack` is the emoji on the X button.
export function showTouchControls(container, buttons, labels) {
  const { root, add, size } = makeRoot(container);

  // Left thumb: arrows
  if (buttons.left) add('ArrowLeft', '◀', { left: '16px', bottom: '70px', ...size(76) });
  if (buttons.right) add('ArrowRight', '▶', { left: '176px', bottom: '70px', ...size(76) });
  if (buttons.up) add('ArrowUp', '▲', { left: '96px', bottom: '146px', ...size(76) });
  if (buttons.down) add('ArrowDown', '▼', { left: '96px', bottom: '16px', ...size(68) });

  // Right thumb: jump and attack, with powers above them
  add('Space', labels.jump, { right: '20px', bottom: '24px', ...size(96), fontSize: '18px' });
  add('KeyX', buttons.attack, { right: '132px', bottom: '40px', ...size(80), fontSize: '30px' });
  const powers = [
    buttons.invisible && ['KeyC', '👻'],
    buttons.shadow && ['KeyC', '🌑'],
    buttons.shield && ['KeyV', '🛡️'],
    buttons.fly && ['KeyF', '🕊️'],
    buttons.mecha && ['KeyR', '🤖'],
    buttons.swap && ['KeyQ', '🔄'],
    buttons.freeze && ['KeyZ', '❄️'],
  ].filter(Boolean);
  powers.forEach(([code, emoji], i) => add(code, emoji, { right: `${20 + i * 72}px`, bottom: '140px', ...size(62), fontSize: '26px' }));

  add('Escape', '⏸', { left: '50%', bottom: '16px', marginLeft: '-24px', ...size(48), fontSize: '18px' });

  return { destroy: () => root.remove() };
}

// 2 PLAYERS on one iPad: each player gets their own buttons on their side of the screen.
export function showTwoPlayerTouch(container) {
  const { root, add, size } = makeRoot(container);
  const side = (keys, edge, color) => {
    const at = (offset) => ({ [edge]: `${offset}px` });
    add(keys.left, '◀', { ...at(12), bottom: '86px', ...size(62), borderColor: color });
    add(keys.right, '▶', { ...at(84), bottom: '86px', ...size(62), borderColor: color });
    add(keys.jump, '⬆', { ...at(48), bottom: '158px', ...size(62), borderColor: color });
    add(keys.attack, '💥', { ...at(12), bottom: '14px', ...size(62), borderColor: color, fontSize: '26px' });
    add(keys.special, '✨', { ...at(84), bottom: '14px', ...size(62), borderColor: color, fontSize: '26px' });
  };
  side({ left: 'KeyA', right: 'KeyD', jump: 'KeyW', attack: 'KeyF', special: 'KeyG' }, 'left', '#ffd23f');
  side({ left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', attack: 'Enter', special: 'ShiftLeft' }, 'right', '#4fc3f7');
  add('Escape', '⏸', { left: '50%', bottom: '16px', marginLeft: '-24px', ...size(48), fontSize: '18px' });
  return { destroy: () => root.remove() };
}

function makeRoot(container) {
  const root = document.createElement('div');
  root.className = 'touch';
  root.innerHTML = `<style>${STYLE}</style>`;
  container.appendChild(root);

  const add = (code, text, style) => {
    const button = document.createElement('button');
    button.textContent = text;
    Object.assign(button.style, style);
    let held = false;
    const press = (event) => {
      event.preventDefault();
      if (held) return;
      held = true;
      button.classList.add('held');
      sendKey('keydown', code);
    };
    const release = (event) => {
      event.preventDefault();
      if (!held) return;
      held = false;
      button.classList.remove('held');
      sendKey('keyup', code);
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    root.appendChild(button);
  };

  const size = (px) => ({ width: `${px}px`, height: `${px}px` });
  return { root, add, size };
}

// Which buttons a hero needs. `threeD` adds up/down (World 2 walks forward and back).
export function touchButtonsFor(character, powerUps, threeD) {
  const attack = { laser: '👀', superLaser: '👀', scratch: '🐾', tongue: '👅', moon: '🌕', goldLaser: '✨' }[character.attack];
  const fly = powerUps.includes('fly');
  return {
    left: true,
    right: true,
    up: threeD || fly,
    down: threeD || fly,
    attack,
    invisible: character.invisibility,
    shadow: character.shadow,
    mecha: powerUps.includes('mecha-capybara'),
    swap: Boolean(character.attacks),
    freeze: powerUps.includes('freeze'),
    shield: powerUps.includes('shield'),
    fly,
  };
}
