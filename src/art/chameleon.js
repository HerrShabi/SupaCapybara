import { drawCape, CAPE } from './heroParts.js';

const GREEN = 0x7cc242;
const GREEN_DARK = 0x3e7d1f;

// fbi: FBI AGENT CHAMELEON (blue FBI jacket over a black suit, a yellow FBI badge, sunglasses, no cape).
export function drawChameleon(g, { legOffset = 0, capeFlying = false }, { suit = 0xf06292, cape = CAPE, fbi = false, noCape = false } = {}) {
  if (!noCape) drawCape(g, capeFlying, cape);

  // Curly spiral tail
  g.fillStyle(GREEN);
  g.fillRect(16, 26, 10, 8);
  g.fillCircle(13, 28, 11);
  g.lineStyle(2, GREEN_DARK);
  g.strokeCircle(13, 28, 11);
  g.strokeCircle(14, 27, 6);
  g.strokeCircle(15, 27, 2);

  // Legs
  g.lineStyle(4, fbi ? 0x16161c : GREEN_DARK);
  g.lineBetween(28 + legOffset, 36, 26 + legOffset, 46);
  g.lineBetween(42 - legOffset, 36, 44 - legOffset, 46);

  // Body (pink suit, or the FBI jacket)
  g.fillStyle(suit);
  g.fillRoundedRect(22, 20, 26, 18, 6);
  if (fbi) {
    g.fillStyle(0x16161c);
    g.fillTriangle(40, 20, 48, 20, 46, 32); // the black suit under the open jacket
    g.fillStyle(0xffd23f);
    g.fillPoints([{ x: 30, y: 23 }, { x: 35, y: 24 }, { x: 35, y: 29 }, { x: 30, y: 33 }, { x: 25, y: 29 }, { x: 25, y: 24 }], true); // FBI badge
    g.fillStyle(0xb8860b);
    g.fillCircle(30, 28, 1.6);
  }

  // Head
  g.fillStyle(GREEN);
  g.fillEllipse(53, 22, 24, 18);
  g.fillStyle(GREEN_DARK);
  g.fillTriangle(44, 14, 50, 8, 54, 14); // crest

  // Big chameleon eye (or cool sunglasses) and mouth
  if (fbi) {
    g.fillStyle(0x111111);
    g.fillRoundedRect(46, 15, 16, 8, 3);
    g.fillRect(43, 16, 4, 2);
    g.fillStyle(0xffffff);
    g.fillRect(55, 16, 4, 2); // shine
  } else {
    g.fillStyle(0xffffff);
    g.fillCircle(53, 19, 5);
    g.fillStyle(0x000000);
    g.fillCircle(54.5, 19, 2.5);
  }
  g.lineStyle(2, GREEN_DARK);
  g.lineBetween(56, 26, 64, 25);

  // Cape collar
  if (noCape) return;
  g.fillStyle(cape);
  g.fillRect(40, 16, 5, 10);
}
