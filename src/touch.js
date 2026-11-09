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
  KeyE: { key: 'e', keyCode: 69 },
  KeyB: { key: 'b', keyCode: 66 },
  Escape: { key: 'Escape', keyCode: 27 },
  // Two players: player 1 uses A D W F G, player 2 uses the arrows, ENTER and SHIFT (see controls.js)
  KeyA: { key: 'a', keyCode: 65 },
  KeyD: { key: 'd', keyCode: 68 },
  KeyW: { key: 'w', keyCode: 87 },
  KeyG: { key: 'g', keyCode: 71 },
  KeyT: { key: 't', keyCode: 84 },
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
  .touch .stick-zone { position: absolute; pointer-events: auto; touch-action: none; -webkit-tap-highlight-color: transparent; }
  .touch .stick-base { position: absolute; left: 50%; top: 50%; width: 130px; height: 130px; margin: -65px 0 0 -65px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.6); background: rgba(0,0,0,0.25); pointer-events: none; }
  .touch .stick-base.active { background: rgba(0,0,0,0.4); border-color: rgba(255,210,63,0.9); }
  .touch .stick-knob { position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; border-radius: 50%;
    background: rgba(255,255,255,0.8); transform: translate(-50%, -50%); }
`;

const STICK_REACH = 55; // how far (px) the knob moves from the middle
const STICK_DEAD = 14; // a little wiggle in the middle does nothing
const STICK_SLANT = 0.38; // pushing up to ~67° away from straight left/right still counts as left/right (so diagonals press both)

// buttons: { left, right, up, down, attack, invisible, shield, fly } — which ones to show. `attack` is the emoji on the X button.
export function showTouchControls(container, buttons, labels) {
  const { root, add, addJoystick, size } = makeRoot(container);

  // Left thumb: a joystick (up and down only where the level uses them, so pushing up doesn't jump in 2D)
  addJoystick(
    { left: buttons.left && 'ArrowLeft', right: buttons.right && 'ArrowRight', up: buttons.up && 'ArrowUp', down: buttons.down && 'ArrowDown' },
    { left: '0px', bottom: '0px', width: '270px', height: '250px' },
  );

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
    buttons.pencil && ['KeyE', '✏️'],
    buttons.strawberry && ['KeyB', '🍓'],
    buttons.mega && ['KeyG', '🌈'],
    buttons.sniper && ['KeyT', '🎯'],
  ].filter(Boolean);
  powers.forEach(([code, emoji], i) => add(code, emoji, { right: `${20 + i * 72}px`, bottom: '140px', ...size(62), fontSize: '26px' }));

  add('Escape', '⏸', { left: '50%', bottom: '16px', marginLeft: '-24px', ...size(48), fontSize: '18px' });

  return { destroy: () => root.remove() };
}

// 2 PLAYERS on one iPad: each player gets their own buttons on their side of the screen.
export function showTwoPlayerTouch(container) {
  const { root, add, addJoystick, size } = makeRoot(container);
  // Each side: a joystick (left/right) by the edge, and jump, attack and power buttons next to it
  const side = (keys, edge, color) => {
    const at = (offset) => ({ [edge]: `${offset}px` });
    addJoystick({ left: keys.left, right: keys.right }, { ...at(0), bottom: '0px', width: '170px', height: '190px' });
    add(keys.jump, '⬆', { ...at(176), bottom: '96px', ...size(62), borderColor: color });
    add(keys.attack, '💥', { ...at(176), bottom: '20px', ...size(62), borderColor: color, fontSize: '26px' });
    add(keys.special, '✨', { ...at(246), bottom: '58px', ...size(56), borderColor: color, fontSize: '24px' });
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

  // A floating joystick: put your thumb down anywhere in the zone and the stick appears right there; then slide.
  // It holds the arrow keys for the directions you push (keys: { left, right, up, down }, any can be missing).
  const addJoystick = (keys, style) => {
    const zone = document.createElement('div');
    zone.className = 'stick-zone';
    Object.assign(zone.style, style);
    const base = document.createElement('div');
    base.className = 'stick-base';
    const knob = document.createElement('div');
    knob.className = 'stick-knob';
    base.appendChild(knob);
    zone.appendChild(base);
    root.appendChild(zone);

    const pressed = new Set();
    const hold = (code, on) => {
      if (!code || on === pressed.has(code)) return;
      if (on) pressed.add(code);
      else pressed.delete(code);
      sendKey(on ? 'keydown' : 'keyup', code);
    };
    let pointer = null;
    let center = { x: 0, y: 0 };
    const steer = (x, y) => {
      let dx = x - center.x;
      let dy = y - center.y;
      const distance = Math.hypot(dx, dy);
      if (distance > STICK_REACH) {
        dx = (dx / distance) * STICK_REACH;
        dy = (dy / distance) * STICK_REACH;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const pushing = distance > STICK_DEAD;
      const sideways = pushing && Math.abs(dx) / Math.max(distance, 1) > STICK_SLANT;
      const upDown = pushing && Math.abs(dy) / Math.max(distance, 1) > STICK_SLANT;
      hold(keys.left, sideways && dx < 0);
      hold(keys.right, sideways && dx > 0);
      hold(keys.up, upDown && dy < 0);
      hold(keys.down, upDown && dy > 0);
    };
    const letGo = (event) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      for (const code of [...pressed]) hold(code, false);
      base.classList.remove('active');
      base.style.left = '50%';
      base.style.top = '50%';
      knob.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (pointer !== null) return;
      pointer = event.pointerId;
      zone.setPointerCapture?.(pointer);
      const rect = zone.getBoundingClientRect();
      center = { x: event.clientX, y: event.clientY };
      base.style.left = `${center.x - rect.left}px`;
      base.style.top = `${center.y - rect.top}px`;
      base.classList.add('active');
      steer(event.clientX, event.clientY);
    });
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointer) return;
      event.preventDefault();
      steer(event.clientX, event.clientY);
    });
    zone.addEventListener('pointerup', letGo);
    zone.addEventListener('pointercancel', letGo);
    zone.addEventListener('lostpointercapture', letGo);
    zone.addEventListener('contextmenu', (event) => event.preventDefault());
  };

  const size = (px) => ({ width: `${px}px`, height: `${px}px` });
  return { root, add, addJoystick, size };
}

// Which buttons a hero needs. `threeD` adds up/down (World 2 walks forward and back).
export function touchButtonsFor(character, powerUps, threeD) {
  const attack = { laser: '👀', superLaser: '👀', scratch: '🐾', tongue: '👅', moon: '🌕', goldLaser: '✨', cuffs: '🔗' }[character.attack];
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
    sniper: powerUps.includes('supa-sniper'),
    strawberry: true, // the magic strawberry (it says so if your bag is empty)
  };
}
