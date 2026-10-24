// Bad guys from Ethan's drawing (concept-art/bad-guys.jpeg).
// World 3 (the volcano) has fire versions: flaming sunglasses, a burning apple and a lava robot.

const FIRE = 0xff6d00;
const FIRE_BRIGHT = 0xffd54f;

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

// Little flames along the top of a fire bad guy.
function flames(g, x, y, width) {
  for (let fx = x; fx < x + width; fx += 10) {
    g.fillStyle(FIRE);
    g.fillTriangle(fx, y + 10, fx + 10, y + 10, fx + 5, y - 2);
    g.fillStyle(FIRE_BRIGHT);
    g.fillTriangle(fx + 2, y + 10, fx + 8, y + 10, fx + 5, y + 3);
  }
}

// Pixel sunglasses: two blocky lenses joined by a bar. `top` moves them down to make room for flames.
function drawSunglasses(g, { frame = 0x111111, top = 0 }) {
  const lens = (x) => {
    g.fillStyle(frame);
    g.fillRect(x, top + 6, 20, 6);
    g.fillRect(x + 2, top + 12, 16, 4);
    g.fillRect(x + 4, top + 16, 12, 4);
    g.fillStyle(0xffffff);
    g.fillRect(x + 4, top + 8, 4, 3);
    g.fillRect(x + 8, top + 12, 3, 3);
  };
  g.fillStyle(frame);
  g.fillRect(0, top + 2, 52, 4); // top bar
  g.fillRect(0, top, 3, 8); // left arm
  g.fillRect(49, top, 3, 8); // right arm
  lens(3);
  lens(29);
}

// Angry apple with a blaster on each side.
function drawApple(g, { skin = 0xe03a3a, shine = 0xff7a7a }) {
  // Blasters
  g.fillStyle(0x444455);
  g.fillRect(0, 28, 14, 9);
  g.fillRect(50, 28, 14, 9);
  g.fillStyle(0x222233);
  g.fillRect(0, 30, 3, 5);
  g.fillRect(61, 30, 3, 5);
  // Apple
  g.fillStyle(skin);
  g.fillCircle(25, 34, 16);
  g.fillCircle(39, 34, 16);
  g.fillEllipse(32, 42, 30, 24);
  g.fillStyle(shine);
  g.fillCircle(22, 28, 4);
  // Stem and leaf
  g.fillStyle(0x6b3e1e);
  g.fillRect(31, 10, 3, 10);
  g.fillStyle(0x4caf50);
  g.fillEllipse(39, 13, 12, 6);
  // Angry face
  g.fillStyle(0xffffff);
  g.fillCircle(26, 34, 4);
  g.fillCircle(38, 34, 4);
  g.fillStyle(0x000000);
  g.fillCircle(27, 35, 2);
  g.fillCircle(37, 35, 2);
  g.lineStyle(2, 0x000000);
  g.lineBetween(21, 27, 30, 31);
  g.lineBetween(43, 27, 34, 31);
  g.lineBetween(28, 44, 36, 44);
}

// Ball robot with stick legs and a blaster arm (faces right).
function drawRobot(g, { ball = 0x8fd14f, middle = 0x6cc0c9, shine = 0xc6f08a }) {
  g.lineStyle(3, 0x1a2a6c);
  g.lineBetween(22, 34, 12, 44);
  g.lineBetween(12, 44, 10, 55);
  g.lineBetween(38, 34, 46, 44);
  g.lineBetween(46, 44, 44, 55);
  g.lineBetween(14, 22, 2, 22);
  g.lineBetween(46, 22, 64, 22);
  g.fillStyle(ball);
  g.fillCircle(30, 24, 16);
  g.fillStyle(middle);
  g.fillCircle(34, 28, 9);
  g.fillStyle(shine);
  g.fillCircle(24, 17, 5);
  g.lineStyle(2, 0x1a2a6c);
  g.strokeCircle(30, 24, 16);
  g.fillStyle(0x1a2a6c);
  g.fillRect(62, 15, 12, 14);
  g.fillRect(74, 19, 6, 6);
}

export function createSunglassesTexture(scene) {
  make(scene, 'sunglasses', 52, 22, (g) => drawSunglasses(g, {}));
}

export function createAppleTexture(scene) {
  make(scene, 'apple', 64, 56, (g) => drawApple(g, {}));
}

export function createRobotTexture(scene) {
  make(scene, 'robot', 80, 56, (g) => drawRobot(g, {}));
}

// Volcano versions, plus the horned knight and its TNT bolts.
export function createFireBadGuyTextures(scene) {
  make(scene, 'fire-sunglasses', 52, 34, (g) => {
    flames(g, 2, 2, 48);
    drawSunglasses(g, { frame: 0x5d0000, top: 12 });
  });
  make(scene, 'fire-apple', 64, 56, (g) => {
    drawApple(g, { skin: 0xff6d00, shine: 0xffd54f });
    flames(g, 14, 6, 36);
  });
  make(scene, 'lava-robot', 80, 56, (g) => {
    drawRobot(g, { ball: 0xff7043, middle: 0xffd54f, shine: 0xffccbc });
    flames(g, 16, 2, 28);
  });

  // Horned knight robot with red wings (concept-art/bad-guys.jpeg), faces right.
  make(scene, 'knight', 90, 80, (g) => {
    // Red wings
    g.fillStyle(0xd32f2f);
    g.fillTriangle(42, 34, 2, 14, 10, 52);
    g.fillTriangle(48, 34, 88, 14, 80, 52);
    // Legs and armored feet
    g.lineStyle(4, 0x1a2a6c);
    g.lineBetween(40, 54, 34, 72);
    g.lineBetween(50, 54, 56, 72);
    g.fillStyle(0x9aa0aa);
    g.fillRect(28, 70, 12, 8);
    g.fillRect(52, 70, 12, 8);
    // Body armor
    g.fillStyle(0x78909c);
    g.fillRoundedRect(32, 28, 26, 28, 6);
    g.fillStyle(0xffd54f);
    g.fillRect(36, 38, 18, 4); // belt
    // Head with a helmet and two big horns
    g.fillStyle(0x9aa0aa);
    g.fillRoundedRect(35, 12, 20, 18, 6);
    g.fillStyle(0x263238);
    g.fillRect(39, 19, 14, 4); // visor
    g.fillStyle(0xeeeeee);
    g.fillTriangle(35, 16, 22, 0, 40, 12);
    g.fillTriangle(55, 16, 68, 0, 50, 12);
  });

  // TNT bolt: looks just like a normal bolt, except for a tiny fuse with a spark on top.
  make(scene, 'tnt-bolt', 26, 32, (g) => {
    const top = 6;
    g.fillStyle(0xb8860b);
    g.fillCircle(13, top + 13, 13);
    g.fillStyle(0xffd23f);
    g.fillCircle(13, top + 13, 10);
    g.fillStyle(0xffffff);
    g.fillPoints(
      [
        { x: 15, y: top + 4 }, { x: 7, y: top + 14 }, { x: 12, y: top + 14 },
        { x: 10, y: top + 22 }, { x: 19, y: top + 11 }, { x: 14, y: top + 11 }, { x: 17, y: top + 4 },
      ],
      true,
    );
    // The clue: a tiny fuse and spark
    g.lineStyle(2, 0x5d4037);
    g.lineBetween(19, top + 1, 22, top - 3);
    g.fillStyle(0xff3d00);
    g.fillCircle(23, 2, 2);
    g.fillStyle(0xffff00);
    g.fillCircle(23, 2, 1);
  });
}
