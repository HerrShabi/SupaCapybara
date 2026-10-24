import { drawCape, CAPE } from './heroParts.js';

const GREEN = 0x7cc242;
const GREEN_DARK = 0x3e7d1f;

export function drawChameleon(g, { legOffset = 0, capeFlying = false }, { suit = 0xf06292, cape = CAPE } = {}) {
  drawCape(g, capeFlying, cape);

  // Curly spiral tail
  g.fillStyle(GREEN);
  g.fillRect(16, 26, 10, 8);
  g.fillCircle(13, 28, 11);
  g.lineStyle(2, GREEN_DARK);
  g.strokeCircle(13, 28, 11);
  g.strokeCircle(14, 27, 6);
  g.strokeCircle(15, 27, 2);

  // Legs
  g.lineStyle(4, GREEN_DARK);
  g.lineBetween(28 + legOffset, 36, 26 + legOffset, 46);
  g.lineBetween(42 - legOffset, 36, 44 - legOffset, 46);

  // Body (pink suit)
  g.fillStyle(suit);
  g.fillRoundedRect(22, 20, 26, 18, 6);

  // Head
  g.fillStyle(GREEN);
  g.fillEllipse(53, 22, 24, 18);
  g.fillStyle(GREEN_DARK);
  g.fillTriangle(44, 14, 50, 8, 54, 14); // crest

  // Big chameleon eye and mouth
  g.fillStyle(0xffffff);
  g.fillCircle(53, 19, 5);
  g.fillStyle(0x000000);
  g.fillCircle(54.5, 19, 2.5);
  g.lineStyle(2, GREEN_DARK);
  g.lineBetween(56, 26, 64, 25);

  // Cape collar
  g.fillStyle(cape);
  g.fillRect(40, 16, 5, 10);
}
