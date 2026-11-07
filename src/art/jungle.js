// The Jungle (Ethan's round 8 design): naughty monkeys that throw coconuts, chomping flowers with stretchy
// necks, and the old temple's stone pieces. Vines and snake vines are drawn live by the scene (they swing).

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createJungleTextures(scene) {
  // Monkey (facing right), sitting with a coconut-throwing arm up
  make(scene, 'monkey', 56, 56, (g) => {
    g.fillStyle(0x6d4c41);
    g.fillEllipse(26, 36, 30, 28); // body
    g.fillCircle(30, 16, 13); // head
    g.fillCircle(16, 10, 6); // ear
    g.fillRoundedRect(36, 4, 8, 22, 4); // arm up
    g.lineStyle(4, 0x6d4c41);
    g.lineBetween(12, 44, 2, 30); // tail
    g.lineBetween(2, 30, 6, 22);
    g.fillStyle(0xd7ccc8);
    g.fillEllipse(34, 19, 16, 12); // face
    g.fillEllipse(26, 38, 16, 16); // tummy
    g.fillStyle(0x000000);
    g.fillCircle(31, 15, 2);
    g.fillCircle(38, 15, 2);
    g.lineStyle(2, 0x000000);
    g.lineBetween(31, 23, 38, 22); // cheeky grin
    g.fillStyle(0x4e342e);
    g.fillEllipse(18, 50, 14, 8);
    g.fillEllipse(34, 50, 14, 8);
  });

  make(scene, 'coconut', 26, 26, (g) => {
    g.fillStyle(0x5d4037);
    g.fillCircle(13, 13, 11);
    g.fillStyle(0x3e2723);
    g.fillCircle(9, 9, 2);
    g.fillCircle(15, 8, 2);
    g.fillCircle(12, 14, 2);
    g.lineStyle(1, 0x8d6e63);
    g.lineBetween(4, 16, 20, 20);
  });

  // Chomping flower head (facing right): red petals, a big mouth with teeth
  make(scene, 'flower-head', 60, 52, (g) => {
    g.fillStyle(0xe53935);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      g.fillCircle(28 + Math.cos(angle) * 16, 26 + Math.sin(angle) * 16, 11);
    }
    g.fillStyle(0xffeb3b);
    g.fillCircle(28, 26, 15);
    g.fillStyle(0x4a0000);
    g.fillTriangle(30, 26, 60, 12, 60, 40); // open mouth
    g.fillStyle(0xffffff);
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(40 + i * 6, 18 - i * 2, 45 + i * 6, 18 - i * 2, 42 + i * 6, 24);
      g.fillTriangle(40 + i * 6, 34 + i * 2, 45 + i * 6, 34 + i * 2, 42 + i * 6, 28);
    }
    g.fillStyle(0x000000);
    g.fillCircle(24, 20, 3);
  });
}

// A big leafy tree in the background
export function drawJungleTree(g, x, bottom, height, dark) {
  g.fillStyle(dark ? 0x3e2723 : 0x5d4037);
  g.fillRect(x - 10, bottom - height, 20, height);
  g.fillStyle(dark ? 0x1b5e20 : 0x2e7d32);
  g.fillCircle(x, bottom - height, 50);
  g.fillCircle(x - 40, bottom - height + 20, 36);
  g.fillCircle(x + 42, bottom - height + 16, 38);
}

// A thick branch you can stand on (a one-way platform)
export function drawBranch(g, x, top, width) {
  g.fillStyle(0x6d4c41);
  g.fillRoundedRect(x, top, width, 16, 8);
  g.fillStyle(0x4e342e);
  g.fillRect(x + 8, top + 10, width - 16, 4);
  g.fillStyle(0x43a047);
  g.fillCircle(x + 10, top - 2, 9);
  g.fillCircle(x + width - 12, top - 4, 11);
}

// The quiz statue: a big stone head with a door in its chin
export function drawStatue(g, x, floorY, doorOpen) {
  g.fillStyle(0x78909c);
  g.fillRoundedRect(x - 55, floorY - 150, 110, 150, 18);
  g.fillStyle(0x607d8b);
  g.fillRect(x - 62, floorY - 160, 124, 20); // brow
  g.fillRect(x - 12, floorY - 120, 24, 44); // nose
  g.fillStyle(0x263238);
  g.fillRect(x - 40, floorY - 128, 22, 12); // eyes
  g.fillRect(x + 18, floorY - 128, 22, 12);
  g.fillStyle(doorOpen ? 0xffd54f : 0x37474f);
  g.fillRoundedRect(x - 20, floorY - 58, 40, 58, { tl: 16, tr: 16, bl: 0, br: 0 }); // door
  g.fillStyle(0x4caf50);
  g.fillCircle(x - 50, floorY - 140, 10); // moss
  g.fillCircle(x + 46, floorY - 30, 12);
}

// The temple where Dark Ultra Capybara waits: stone walls, steps and statues with glowing eyes
export function drawTemple(g, x, width, floorY) {
  g.fillStyle(0x263238);
  g.fillRect(x, 0, width, floorY);
  g.fillStyle(0x37474f);
  for (let row = 0; row * 40 < floorY; row++) {
    for (let col = 0; col * 80 < width; col++) g.fillRect(x + col * 80 + (row % 2) * 40 + 2, row * 40 + 2, 76, 36);
  }
  // Steps on both sides
  g.fillStyle(0x546e7a);
  for (let i = 0; i < 3; i++) {
    g.fillRect(x, floorY - (i + 1) * 30, 120 - i * 36, 30);
    g.fillRect(x + width - 120 + i * 36, floorY - (i + 1) * 30, 120 - i * 36, 30);
  }
  // Statues with glowing purple eyes
  for (const sx of [x + 230, x + width - 230]) {
    g.fillStyle(0x455a64);
    g.fillRoundedRect(sx - 40, floorY - 220, 80, 220, 14);
    g.fillStyle(0xb388ff);
    g.fillCircle(sx - 16, floorY - 180, 6);
    g.fillCircle(sx + 16, floorY - 180, 6);
  }
}
