import Phaser from 'phaser';
import { drawCape, drawSuitBolt } from './heroParts.js';

// CAPTAIN WADDLE: a penguin with an orange cape (Ethan's design, 2026-11-13).
// Black body and head, white belly and face, orange beak and feet, the lightning bolt on his belly.
// His wings flap up when he's in the air (that's his double jump).

const BLACK = 0x1c1c24;
const WHITE = 0xffffff;
const ORANGE = 0xff9800;
const ORANGE_DARK = 0xe65100;

export function drawPenguin(g, { legOffset = 0, capeFlying = false, slide = false }, { cape = 0xff8f00 }) {
  if (slide) return drawSliding(g, cape);
  drawCape(g, capeFlying, cape);

  // Orange feet (they waddle)
  g.fillStyle(ORANGE_DARK);
  g.fillEllipse(27 + legOffset, 45, 12, 5);
  g.fillEllipse(40 - legOffset, 45, 12, 5);

  // Body: a black egg with a white belly and the lightning bolt
  g.fillStyle(BLACK);
  g.fillEllipse(33, 28, 28, 34);
  g.fillStyle(WHITE);
  g.fillEllipse(37, 31, 17, 25);
  drawSuitBolt(g, 31, 21);

  // Wing: down by his side, or flapping up in the air
  g.fillStyle(BLACK);
  if (capeFlying) g.fillTriangle(25, 24, 10, 12, 21, 31);
  else g.fillTriangle(25, 22, 17, 38, 27, 36);

  // Head with a white face patch
  g.fillStyle(BLACK);
  g.fillCircle(42, 12, 10);
  g.fillStyle(WHITE);
  g.fillCircle(46, 13, 5.5);
  g.fillStyle(0x000000);
  g.fillCircle(47, 11, 2);
  g.fillStyle(WHITE);
  g.fillCircle(47.6, 10.4, 0.7);

  // Orange beak
  g.fillStyle(ORANGE);
  g.fillTriangle(50, 10, 61, 14, 50, 17);
  g.fillStyle(ORANGE_DARK);
  g.fillTriangle(50, 14, 61, 14, 50, 17);

  // Cape collar
  g.fillStyle(cape);
  g.fillRect(31, 15, 6, 8);
}

// The WADDLE SLIDE: flat on his belly, head first, wings back, feet kicking up behind.
function drawSliding(g, cape) {
  // Cape flapping behind
  const capeDark = Phaser.Display.Color.IntegerToColor(cape).darken(25).color;
  g.fillStyle(capeDark);
  g.fillTriangle(30, 26, 2, 14, 6, 26);
  g.fillStyle(cape);
  g.fillTriangle(32, 27, 4, 20, 26, 32);

  // Feet sticking out at the back
  g.fillStyle(ORANGE_DARK);
  g.fillEllipse(8, 36, 10, 5);
  g.fillEllipse(10, 42, 10, 5);

  // Body lying down: black back on top, white belly underneath
  g.fillStyle(BLACK);
  g.fillEllipse(32, 36, 46, 20);
  g.fillStyle(WHITE);
  g.fillEllipse(34, 41, 38, 9);
  drawSuitBolt(g, 26, 27);

  // Wings stretched back
  g.fillStyle(BLACK);
  g.fillTriangle(34, 32, 14, 28, 22, 36);

  // Head in front
  g.fillStyle(BLACK);
  g.fillCircle(53, 33, 9);
  g.fillStyle(WHITE);
  g.fillCircle(56, 34, 5);
  g.fillStyle(0x000000);
  g.fillCircle(57, 32, 1.8);
  g.fillStyle(ORANGE);
  g.fillTriangle(59, 32, 64, 35, 59, 38);
}
