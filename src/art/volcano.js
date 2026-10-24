// World 3, the volcano: rock ground, lava, the volcano far away, falling rocks, and the Lava Dragon.

export const LAVA = 0xff6d00;
export const LAVA_BRIGHT = 0xffd54f;
const ROCK = 0x4e342e;
const ROCK_DARK = 0x3e2723;

function noise(x, y) {
  return ((Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0) % 100;
}

// A piece of rocky ground with glowing cracks.
export function drawRock(g, { x, width, top, bottom }) {
  g.fillStyle(ROCK);
  g.fillRect(x, top, width, bottom - top);
  g.fillStyle(ROCK_DARK);
  g.fillRect(x - 4, top, width + 8, 12);
  g.lineStyle(3, LAVA, 0.9);
  for (let cx = x + 30; cx < x + width - 20; cx += 70) {
    const cy = top + 30 + (noise(cx, top) % 40);
    g.lineBetween(cx, cy, cx + 18, cy + 22);
    g.lineBetween(cx + 18, cy + 22, cx + 8, cy + 46);
  }
}

// A floating rock ledge you can jump up through.
export function drawLedge(g, { x, top, width }) {
  g.fillStyle(ROCK_DARK);
  g.fillRoundedRect(x, top, width, 22, 6);
  g.fillStyle(ROCK);
  g.fillRoundedRect(x + 4, top + 2, width - 8, 12, 4);
  g.fillStyle(LAVA, 0.8);
  g.fillTriangle(x + width / 2 - 8, top + 22, x + width / 2 + 8, top + 22, x + width / 2, top + 34); // lava drip
}

// The big volcano far away, with glowing lava running down.
export function drawVolcano(g, x, baseY) {
  g.fillStyle(0x2d1b16);
  g.fillTriangle(x - 420, baseY, x + 420, baseY, x, baseY - 330);
  g.fillStyle(0x3e2723);
  g.fillTriangle(x - 300, baseY, x + 120, baseY, x - 40, baseY - 300);
  g.fillStyle(LAVA);
  g.fillEllipse(x, baseY - 322, 110, 26);
  g.lineStyle(8, LAVA, 0.9);
  g.lineBetween(x - 20, baseY - 315, x - 70, baseY - 180);
  g.lineBetween(x - 70, baseY - 180, x - 120, baseY - 60);
  g.lineBetween(x + 25, baseY - 312, x + 80, baseY - 200);
  g.lineStyle(4, LAVA_BRIGHT, 0.9);
  g.lineBetween(x - 20, baseY - 315, x - 70, baseY - 180);
}

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createVolcanoTextures(scene) {
  // Falling lava rock
  make(scene, 'lava-rock', 40, 40, (g) => {
    g.fillStyle(LAVA, 0.4);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0x5d4037);
    g.fillCircle(20, 20, 14);
    g.lineStyle(3, LAVA_BRIGHT);
    g.lineBetween(12, 14, 22, 20);
    g.lineBetween(22, 20, 18, 30);
  });

  // Red arrow that warns where a rock will fall
  make(scene, 'warning', 30, 30, (g) => {
    g.fillStyle(0xff1744);
    g.fillTriangle(0, 0, 30, 0, 15, 26);
    g.fillStyle(0xffffff);
    g.fillRect(13, 4, 4, 10);
  });

  // Dragon fire (faces left)
  make(scene, 'fireball', 44, 30, (g) => {
    g.fillStyle(LAVA, 0.6);
    g.fillEllipse(24, 15, 44, 28);
    g.fillStyle(0xff9100);
    g.fillEllipse(20, 15, 30, 20);
    g.fillStyle(LAVA_BRIGHT);
    g.fillEllipse(14, 15, 14, 10);
  });

  make(scene, 'ember', 6, 6, (g) => {
    g.fillStyle(LAVA_BRIGHT);
    g.fillCircle(3, 3, 3);
  });

  // The Lava Dragon: a lava monster and a fire dragon mixed together (faces left)
  make(scene, 'lava-dragon', 230, 175, (g) => {
    // Wings behind
    g.fillStyle(0x7f1d0d);
    g.fillTriangle(110, 70, 150, 0, 200, 60);
    g.fillTriangle(140, 70, 215, 15, 225, 85);
    g.lineStyle(3, LAVA);
    g.lineBetween(110, 70, 150, 0);
    g.lineBetween(140, 70, 215, 15);
    // Tail
    g.fillStyle(0x5d1a0e);
    g.fillTriangle(170, 95, 230, 120, 175, 135);
    g.fillStyle(LAVA);
    g.fillTriangle(222, 112, 230, 120, 218, 124);
    // Legs and claws
    g.fillStyle(0x4a140a);
    g.fillRect(95, 120, 26, 45);
    g.fillRect(150, 120, 26, 45);
    g.fillStyle(0xeeeeee);
    for (const lx of [95, 150]) {
      g.fillTriangle(lx, 165, lx + 8, 165, lx + 2, 174);
      g.fillTriangle(lx + 10, 165, lx + 18, 165, lx + 12, 174);
      g.fillTriangle(lx + 19, 165, lx + 26, 165, lx + 22, 174);
    }
    // Body made of rock, with lava cracks and a glowing belly
    g.fillStyle(0x5d1a0e);
    g.fillEllipse(135, 100, 130, 80);
    g.fillStyle(0xff8f00);
    g.fillEllipse(125, 115, 80, 40);
    g.lineStyle(4, LAVA_BRIGHT);
    g.lineBetween(110, 75, 125, 95);
    g.lineBetween(125, 95, 115, 110);
    g.lineBetween(160, 80, 150, 100);
    // Neck and head
    g.fillStyle(0x5d1a0e);
    g.fillTriangle(70, 60, 105, 75, 95, 110);
    g.fillRoundedRect(8, 38, 80, 46, 14);
    g.fillStyle(0x4a140a);
    g.fillRoundedRect(0, 60, 50, 26, 8); // jaw
    // Fire glowing in the mouth, and teeth
    g.fillStyle(LAVA_BRIGHT);
    g.fillRect(4, 66, 40, 8);
    g.fillStyle(0xffffff);
    for (let tx = 6; tx < 44; tx += 9) {
      g.fillTriangle(tx, 60, tx + 6, 60, tx + 3, 67);
      g.fillTriangle(tx, 80, tx + 6, 80, tx + 3, 73);
    }
    // Horns, eye and nostril
    g.fillStyle(0x9e9e9e);
    g.fillTriangle(55, 40, 70, 40, 85, 8);
    g.fillTriangle(68, 42, 80, 44, 100, 18);
    g.fillStyle(LAVA_BRIGHT);
    g.fillEllipse(48, 50, 20, 12);
    g.fillStyle(0x000000);
    g.fillRect(46, 45, 4, 10);
    g.fillCircle(12, 50, 3);
  });
}
