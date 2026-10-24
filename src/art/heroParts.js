import Phaser from 'phaser';

// Pieces every hero shares: the blue cape and the lightning bolt on the suit.
// All heroes are drawn facing right in a 64x48 frame, head at the front (right side).

export const HERO_WIDTH = 64;
export const HERO_HEIGHT = 48;

export const CAPE = 0x3b8de2;
const BOLT = 0xffd23f;

// cape: the cape's color (the darker side is worked out from it).
export function drawCape(g, capeFlying, cape = CAPE) {
  const capeDark = Phaser.Display.Color.IntegerToColor(cape).darken(25).color;
  if (capeFlying) {
    g.fillStyle(capeDark);
    g.fillTriangle(40, 14, 2, 8, 8, 24);
    g.fillStyle(cape);
    g.fillTriangle(42, 14, 40, 24, 4, 16);
  } else {
    g.fillStyle(capeDark);
    g.fillTriangle(40, 14, 2, 38, 12, 44);
    g.fillStyle(cape);
    g.fillTriangle(42, 14, 40, 24, 6, 42);
  }
}

// Lightning bolt, drawn with its top at (x, y).
export function drawSuitBolt(g, x, y) {
  g.fillStyle(BOLT);
  g.fillPoints(
    [
      { x: x + 7, y }, { x, y: y + 11 }, { x: x + 6, y: y + 11 },
      { x: x + 2, y: y + 20 }, { x: x + 12, y: y + 8 }, { x: x + 6, y: y + 8 }, { x: x + 10, y },
    ],
    true,
  );
}
