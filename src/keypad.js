import { t } from './i18n.js';
import { audio } from './audio.js';

// THE PORTAL KEYPAD (Ethan's drawing, concept-art/portal-keypad.jpeg): World 1's secret portal opens with a code.
// Buttons 1 2 3 / 4 5 6 / 7 8 9 / ✓ 0 ✗, and the screen under them (like in the drawing). Somebody forgot
// the code on a paper note stuck crooked on the corner: 8725. A wrong code: "NOOOOOOOPE!"
//
// openKeypad(scene, player, { code, onRight, onClose }) shows it over a frozen level and returns { update }:
// call update() every frame instead of the level's update. Arrows + jump/attack press buttons, or tap them.
// ✗ clears what you typed, or closes the keypad when there's nothing typed.

export const PORTAL_CODE = '8725';
const FONT = 'Arial Black, Arial';
const BUTTONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '✓', '0', '✗'];
const MAX_DIGITS = 6;

export function openKeypad(scene, player, { code = PORTAL_CODE, onRight, onClose }) {
  const parts = [];
  const ui = (object) => (parts.push(object.setScrollFactor(0).setDepth(30)), object);
  ui(scene.add.rectangle(480, 270, 960, 540, 0x000000, 0.55).setInteractive());
  ui(scene.add.rectangle(480, 255, 260, 430, 0x546e7a).setStrokeStyle(6, 0x263238));
  let typed = '';
  let index = 0;
  let done = false;
  const openedAt = performance.now();

  const boxes = BUTTONS.map((label, i) => {
    const x = 412 + (i % 3) * 68;
    const y = 95 + Math.floor(i / 3) * 64;
    const color = label === '✓' ? 0x2e7d32 : label === '✗' ? 0xc62828 : 0xeceff1;
    const box = ui(scene.add.rectangle(x, y, 60, 54, color).setStrokeStyle(3, 0x263238).setInteractive({ useHandCursor: true }));
    box.on('pointerdown', () => press(i));
    ui(scene.add.text(x, y, label, { fontFamily: FONT, fontSize: '26px', color: label === '✓' || label === '✗' ? '#ffffff' : '#263238' }).setOrigin(0.5));
    return box;
  });
  // The screen (under the buttons, like in the drawing)
  ui(scene.add.rectangle(480, 375, 200, 54, 0x102027).setStrokeStyle(3, 0x263238));
  const screen = ui(scene.add.text(480, 375, '', { fontFamily: 'Courier New, monospace', fontSize: '34px', color: '#76ff03' }).setOrigin(0.5));
  // The forgotten note with the code, stuck crooked over the corner
  ui(scene.add.rectangle(590, 70, 150, 46, 0xfffde7).setStrokeStyle(2, 0xbdbdbd).setAngle(38));
  ui(scene.add.text(590, 70, code, { fontFamily: 'Comic Sans MS, Arial', fontSize: '28px', color: '#37474f' }).setOrigin(0.5).setAngle(38));
  ui(scene.add.text(480, 445, t('keypad.help'), { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setStroke('#000000', 3).setOrigin(0.5));

  const show = () => {
    screen.setText(typed.padEnd(4, '_'));
    boxes.forEach((box, i) => box.setStrokeStyle(i === index ? 6 : 3, i === index ? 0xffd23f : 0x263238));
  };

  const close = (opened) => {
    if (done) return;
    done = true;
    for (const part of parts) part.destroy();
    onClose?.(opened);
  };

  function press(i) {
    if (done) return;
    index = i;
    const label = BUTTONS[i];
    if (label === '✗') {
      audio.play('click');
      if (typed) typed = '';
      else return close(false);
    } else if (label === '✓') {
      if (typed === code) {
        audio.play('key');
        screen.setColor('#ffffff');
        screen.setText('OPEN!');
        done = true;
        // (a real timer: the level's clock is frozen while the keypad is open)
        setTimeout(() => {
          if (!scene.sys.isActive()) return;
          done = false;
          close(true);
          onRight?.();
        }, 700);
        return;
      }
      // NOOOOOOOPE!
      audio.play('error');
      scene.cameras.main.shake(250, 0.01);
      const nope = ui(scene.add.text(480, 250, t('keypad.nope'), { fontFamily: FONT, fontSize: '56px', color: '#ff5252' }).setStroke('#000000', 10).setOrigin(0.5).setDepth(31));
      scene.tweens.add({ targets: nope, scale: 1.25, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 4, onComplete: () => nope.destroy() });
      typed = '';
    } else if (typed.length < MAX_DIGITS) {
      audio.play('click');
      typed += label;
    }
    show();
  }

  show();
  return {
    update() {
      if (done) return;
      const c = player.controls;
      if (c.justPressed('left')) index = (index + 11) % 12;
      if (c.justPressed('right')) index = (index + 1) % 12;
      if (c.justPressed('up')) index = (index + 9) % 12;
      if (c.justPressed('down')) index = (index + 3) % 12;
      show();
      // (wait a moment, so the jump that brought you here doesn't press a button)
      if (performance.now() - openedAt > 400 && (c.justPressed('jump') || c.justPressed('attack'))) press(index);
    },
  };
}

// The little keypad on its pole in the level (with the note), standing on the ground at (x, ground)
export function drawKeypadPost(scene, x, ground) {
  const g = scene.add.graphics().setDepth(1.2);
  g.fillStyle(0x455a64).fillRect(x - 3, ground - 50, 6, 50);
  g.fillStyle(0x546e7a).fillRoundedRect(x - 17, ground - 92, 34, 46, 4);
  g.fillStyle(0xeceff1);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) g.fillRect(x - 12 + col * 9, ground - 87 + row * 8, 6, 5);
  g.fillStyle(0x102027).fillRect(x - 12, ground - 55, 24, 6);
  // the note, crooked on the corner
  const note = scene.add.rectangle(x + 13, ground - 92, 22, 9, 0xfffde7).setAngle(38).setDepth(1.25);
  return [g, note];
}
