import { drawCape, drawSuitBolt, CAPE } from './heroParts.js';

const OUTLINE = 0x1a2a6c;

export function drawCat(g, { legOffset = 0, capeFlying = false }, { suit, suitDark, fur = 0xffffff, cape = CAPE }) {
  drawCape(g, capeFlying, cape);

  // Tail sticking up
  g.lineStyle(7, OUTLINE);
  g.lineBetween(16, 30, 6, 20);
  g.lineBetween(6, 20, 8, 8);
  g.lineStyle(4, fur);
  g.lineBetween(16, 30, 6, 20);
  g.lineBetween(6, 20, 8, 8);

  // Legs (suit) with white paws
  g.fillStyle(suitDark);
  g.fillRect(18 + legOffset, 36, 7, 8);
  g.fillRect(40 - legOffset, 36, 7, 8);
  g.fillStyle(fur);
  g.fillRect(18 + legOffset, 43, 7, 4);
  g.fillRect(40 - legOffset, 43, 7, 4);

  // Body (suit) with the lightning bolt
  g.fillStyle(suit);
  g.fillEllipse(31, 30, 38, 20);
  drawSuitBolt(g, 24, 21);

  // Head with pointy ears
  g.fillStyle(OUTLINE);
  g.fillCircle(50, 18, 12);
  g.fillTriangle(39, 13, 43, -1, 50, 8);
  g.fillTriangle(50, 8, 57, -1, 61, 13);
  g.fillStyle(fur);
  g.fillCircle(50, 18, 10.5);
  g.fillTriangle(41, 12, 44, 2, 49, 9);
  g.fillTriangle(51, 9, 56, 2, 59, 12);
  g.fillStyle(0xff9ec4);
  g.fillTriangle(43, 10, 45, 5, 47, 9);
  g.fillTriangle(53, 9, 55, 5, 57, 10);

  // Face
  g.fillStyle(0x000000);
  g.fillCircle(46, 17, 1.8);
  g.fillCircle(54, 17, 1.8);
  g.fillStyle(0xff6f9c);
  g.fillCircle(50, 21, 1.5);
  g.lineStyle(1, 0x333333);
  g.lineBetween(53, 21, 63, 19);
  g.lineBetween(53, 22, 63, 23);

  // Cape collar
  g.fillStyle(cape);
  g.fillRect(36, 18, 5, 9);
}
