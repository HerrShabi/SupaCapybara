// Underwater City (Ethan's round 7 design): bouncy jellyfish, ink-shooting octopuses, robot sharks that
// fire torpedoes, air bubbles, plus the city's glass domes, coral houses and sunken ruins.

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createUnderwaterTextures(scene) {
  // Jellyfish: a pink see-through dome with wiggly tentacles
  make(scene, 'jellyfish', 56, 64, (g) => {
    g.fillStyle(0xf48fb1, 0.85);
    g.fillEllipse(28, 20, 52, 38);
    g.fillStyle(0xf8bbd0, 0.9);
    g.fillEllipse(22, 14, 18, 10);
    g.fillStyle(0xf06292, 0.9);
    g.fillRect(4, 22, 48, 8);
    g.lineStyle(4, 0xf48fb1, 0.85);
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * 9;
      g.lineBetween(x, 30, x + (i % 2 ? 4 : -4), 46);
      g.lineBetween(x + (i % 2 ? 4 : -4), 46, x, 62);
    }
    g.fillStyle(0x000000);
    g.fillCircle(20, 20, 3);
    g.fillCircle(36, 20, 3);
  });

  // Octopus: a purple head with big eyes and curly tentacles
  make(scene, 'octopus', 64, 60, (g) => {
    g.fillStyle(0x8e24aa);
    g.fillEllipse(32, 20, 46, 38);
    for (let i = 0; i < 6; i++) {
      const x = 10 + i * 9;
      g.fillRoundedRect(x - 3, 30, 8, 24, 4);
      g.fillCircle(x + (i % 2 ? 4 : -2), 54, 5);
    }
    g.fillStyle(0xce93d8);
    for (let i = 0; i < 4; i++) g.fillCircle(14 + i * 12, 12, 3);
    g.fillStyle(0xffffff);
    g.fillCircle(24, 22, 7);
    g.fillCircle(40, 22, 7);
    g.fillStyle(0x000000);
    g.fillCircle(25, 23, 4);
    g.fillCircle(41, 23, 4);
  });

  // Robot shark (facing right): gray metal, a fin, a red robot eye and a torpedo tube
  make(scene, 'robot-shark', 100, 50, (g) => {
    g.fillStyle(0x78909c);
    g.fillTriangle(0, 6, 0, 44, 22, 25); // tail
    g.fillEllipse(54, 26, 80, 30);
    g.fillTriangle(44, 12, 62, 12, 50, 0); // fin
    g.fillStyle(0x546e7a);
    g.fillEllipse(54, 34, 70, 12);
    g.fillStyle(0xb0bec5);
    for (let i = 0; i < 4; i++) g.fillCircle(32 + i * 12, 20, 2); // bolts
    g.fillStyle(0xff1744);
    g.fillCircle(80, 20, 4);
    g.fillStyle(0xffffff); // teeth
    for (let i = 0; i < 4; i++) g.fillTriangle(72 + i * 6, 30, 77 + i * 6, 30, 74 + i * 6, 35);
    g.fillStyle(0x37474f);
    g.fillRect(46, 38, 22, 7); // torpedo tube
  });

  // Torpedo (pointing left, like every enemy shot: the game flips it to fly right)
  make(scene, 'torpedo', 34, 12, (g) => {
    g.fillStyle(0xff5252);
    g.fillTriangle(0, 6, 8, 0, 8, 12);
    g.fillStyle(0x607d8b);
    g.fillRect(8, 1, 22, 10);
    g.fillStyle(0xffeb3b);
    g.fillTriangle(30, 1, 34, 0, 34, 12);
  });

  // Ink blob from an octopus
  make(scene, 'ink-shot', 22, 22, (g) => {
    g.fillStyle(0x1a1a2e);
    g.fillCircle(11, 11, 9);
    g.fillCircle(5, 7, 4);
    g.fillCircle(17, 15, 4);
  });

  // Air bubble you grab
  make(scene, 'air-bubble', 40, 40, (g) => {
    g.fillStyle(0xb3e5fc, 0.5);
    g.fillCircle(20, 20, 18);
    g.lineStyle(3, 0xe1f5fe, 0.9);
    g.strokeCircle(20, 20, 18);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(13, 12, 5);
  });
}

// A glass dome over the floor from x1 to x2 (air inside!)
export function drawDome(g, x1, x2, floorY) {
  const radius = (x2 - x1) / 2;
  const cx = (x1 + x2) / 2;
  g.fillStyle(0xb3e5fc, 0.18);
  g.slice(cx, floorY, radius, Math.PI, 0, false);
  g.fillPath();
  g.lineStyle(5, 0xe1f5fe, 0.7);
  g.beginPath();
  g.arc(cx, floorY, radius, Math.PI, 0, false);
  g.strokePath();
  g.lineStyle(2, 0xe1f5fe, 0.35);
  for (let k = 1; k < 4; k++) g.lineBetween(cx + Math.cos(Math.PI + (k * Math.PI) / 4) * radius, floorY + Math.sin(Math.PI + (k * Math.PI) / 4) * radius, cx, floorY);
  g.fillStyle(0x90a4ae);
  g.fillRect(x1 - 6, floorY - 6, x2 - x1 + 12, 8);
}

// A coral house with a shell roof, a door and a round window
export function drawCoralHouse(g, x, floorY, width, height, color) {
  g.fillStyle(color);
  g.fillRoundedRect(x, floorY - height, width, height, 12);
  g.fillStyle(0xffe0b2);
  g.fillEllipse(x + width / 2, floorY - height, width + 16, 30);
  g.fillStyle(0xffcc80);
  for (let i = 0; i < 5; i++) g.fillRect(x - 4 + (i * (width + 8)) / 5, floorY - height - 12, 3, 22);
  g.fillStyle(0x5d4037);
  g.fillRoundedRect(x + width / 2 - 10, floorY - 34, 20, 34, 8);
  g.fillStyle(0x81d4fa);
  g.fillCircle(x + width / 2, floorY - height + 30, 9);
}

// A broken stone pillar from the old sunken city, with seaweed
export function drawPillar(g, x, floorY, height) {
  g.fillStyle(0x90a4ae);
  g.fillRect(x, floorY - height, 34, height);
  g.fillStyle(0xb0bec5);
  g.fillRect(x - 6, floorY - height, 46, 10);
  g.fillRect(x - 6, floorY - 10, 46, 10);
  g.fillStyle(0x607d8b);
  g.fillTriangle(x + 34, floorY - height, x + 20, floorY - height, x + 34, floorY - height + 14); // broken corner
  g.lineStyle(2, 0x607d8b);
  g.lineBetween(x + 10, floorY - height + 20, x + 18, floorY - height / 2);
  drawSeaweed(g, x + 40, floorY, 50);
}

export function drawSeaweed(g, x, floorY, height) {
  g.lineStyle(6, 0x2e7d32);
  let px = x;
  let py = floorY;
  for (let i = 1; i <= 5; i++) {
    const nx = x + (i % 2 ? 8 : -8);
    const ny = floorY - (height * i) / 5;
    g.lineBetween(px, py, nx, ny);
    px = nx;
    py = ny;
  }
}
