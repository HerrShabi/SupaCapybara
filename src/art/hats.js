// Hats and costumes you find in ADVENTURE treasure chests. Heroes wear them in every world.
// Names are in i18n.js as 'hat.<id>'. Which hero wears which hat is save.wearing[heroId].

export const HATS = ['crown', 'pirate', 'wizard', 'party', 'shades'];

// Where the top of the head (and the eyes, for shades) is in each animal's 64x48 hero frame.
const HEAD = {
  capybara: { top: [51, 8], eyes: [52, 15] },
  cat: { top: [50, 7], eyes: [50, 17] },
  chameleon: { top: [52, 13], eyes: [54, 19] },
};

export function animalOf(heroId) {
  if (heroId.includes('cat')) return 'cat';
  if (heroId.includes('chameleon')) return 'chameleon';
  return 'capybara';
}

// Where to put a hat on a hero sprite, as an offset from the sprite's center (before flipping).
export function hatAnchor(heroId, hat, scale) {
  const head = HEAD[animalOf(heroId)];
  const [x, y] = hat === 'shades' ? head.eyes : head.top;
  return { x: (x - 32) * scale, y: (y - 24) * scale };
}

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

// 2D hat textures: 'hat-crown', 'hat-pirate', ... Each is drawn with its bottom middle at the head.
export function createHatTextures(scene) {
  make(scene, 'hat-crown', 22, 14, (g) => {
    g.fillStyle(0xffc107);
    g.fillRect(1, 7, 20, 7);
    g.fillTriangle(1, 8, 5, 0, 8, 8);
    g.fillTriangle(8, 8, 11, 0, 14, 8);
    g.fillTriangle(14, 8, 17, 0, 21, 8);
    g.fillStyle(0xe53935);
    g.fillCircle(11, 10, 2);
    g.fillStyle(0x1e88e5);
    g.fillCircle(5, 10, 1.5);
    g.fillCircle(17, 10, 1.5);
  });
  make(scene, 'hat-pirate', 30, 14, (g) => {
    g.fillStyle(0x212121);
    g.fillTriangle(0, 13, 30, 13, 15, 0);
    g.fillRect(2, 10, 26, 4);
    g.fillStyle(0xffffff);
    g.fillCircle(15, 7, 2.5); // little skull
    g.fillRect(13, 9, 4, 2);
  });
  make(scene, 'hat-wizard', 22, 26, (g) => {
    g.fillStyle(0x5e35b1);
    g.fillTriangle(2, 23, 20, 23, 12, 0);
    g.fillRect(0, 22, 22, 4);
    g.fillStyle(0xffeb3b);
    g.fillCircle(11, 13, 2);
    g.fillCircle(14, 7, 1.5);
  });
  make(scene, 'hat-party', 16, 22, (g) => {
    g.fillStyle(0xff4081);
    g.fillTriangle(1, 21, 15, 21, 8, 2);
    g.fillStyle(0x40c4ff);
    g.fillRect(5, 13, 6, 3);
    g.fillStyle(0xffeb3b);
    g.fillCircle(8, 3, 3); // pompom
  });
  make(scene, 'hat-shades', 22, 8, (g) => {
    g.fillStyle(0x111111);
    g.fillRect(0, 0, 22, 2);
    g.fillRect(1, 2, 9, 5);
    g.fillRect(12, 2, 9, 5);
    g.fillStyle(0xffffff);
    g.fillRect(3, 3, 2, 1);
    g.fillRect(14, 3, 2, 1);
  });
}
