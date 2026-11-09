// The Drawings World (Ethan's round 11 design): everything looks drawn in his notebook, with wobbly blue
// ballpoint-pen outlines and colored-pencil coloring. The heroes are shaped and colored like Ethan's clay models
// (concept-art/clay-*.jpg); the bad guys and bosses come from his drawings (concept-art/bad-guys.jpeg, bosses.jpeg).
//
// pen() draws a wobbly line, pencil() colors a shape with a light fill and pencil strokes.
// The wobble is random but seeded, so every texture looks the same each time.

export const INK = 0x1a237e;
export const PAPER = 0xfdfcf5;

let seed = 1;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const jitter = (amount) => (rand() - 0.5) * amount;

// A wobbly pen line through points (closed = back to the start). Drawn twice, slightly apart, like a real pen.
export function pen(g, points, { color = INK, width = 2, closed = false, wobble = 1.6 } = {}) {
  const list = closed ? [...points, points[0]] : points;
  for (let pass = 0; pass < 2; pass++) {
    g.lineStyle(pass ? width * 0.6 : width, color, pass ? 0.6 : 1);
    g.beginPath();
    list.forEach(([x, y], i) => {
      const px = x + jitter(wobble);
      const py = y + jitter(wobble);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.strokePath();
  }
}

// Points around an ellipse (for pen outlines and pencil fills)
export function ellipsePoints(cx, cy, rx, ry, count = 22) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

export function rectPoints(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

// Colored pencil: a light fill, then slanted strokes across the shape (clipped to its bounding ellipse/box)
export function pencil(g, points, color, { strokes = true } = {}) {
  g.fillStyle(color, 0.55);
  g.fillPoints(points.map(([x, y]) => ({ x, y })), true);
  if (!strokes) return;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  g.lineStyle(2, color, 0.55);
  for (let y = minY + 3; y < maxY - 2; y += 4) {
    // Only inside the shape: find where this row crosses the outline
    const crossings = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const a = Math.max(minX, crossings[i] + 1);
      const b = Math.min(maxX, crossings[i + 1] - 1);
      if (b > a) g.lineBetween(a, y + jitter(1), b, y - 2 + jitter(1));
    }
  }
}

// A shape colored in and outlined
function shape(g, points, color, options = {}) {
  pencil(g, points, color, options);
  pen(g, points, { closed: true, ...options });
}

function make(scene, key, width, height, draw, seedValue = 7) {
  if (scene.textures.exists(key)) return;
  seed = seedValue;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

// ---------- The heroes, like Ethan's clay models (64x48 frames, facing right) ----------

const CLAY = {
  capybara: { fur: 0xc8692c, suit: 0xc2185b, bolt: 0xffeb3b, cape: 0x1e88e5, snout: 0xffffff },
  cat: { fur: 0xffffff, suit: 0xec407a, bolt: 0xd4a017, cape: 0x0e5a6b, ear: 0xf48fb1 },
  chameleon: { head: 0x0e5a6b, eye: 0x69f0ae, body: 0xec407a, back: 0xff7043, tail: 0x69f0ae },
};
// The other heroes use their animal's clay look with their own suit colors
const HERO_LOOKS = {
  'supa-capybara': { animal: 'capybara' },
  'ultra-capybara': { animal: 'capybara', suit: 0xe0457b },
  'golden-capybara': { animal: 'capybara', suit: 0xffc107, cape: 0xfff176 },
  'supa-cat': { animal: 'cat' },
  'bloodmoon-cat': { animal: 'cat', suit: 0x6a1b4d, fur: 0xf3e5f5 },
  'supa-chameleon': { animal: 'chameleon' },
  copybara: { animal: 'capybara', suit: 0x1a3a8a, noCape: true },
};
const POSES = { idle: [0, false], run1: [3, true], run2: [-3, true], jump: [2, true] };

export function doodleHeroKey(id) {
  return `doodle-${HERO_LOOKS[id] ? id : 'supa-capybara'}`;
}

function cape(g, flying, color) {
  const points = flying ? [[34, 14], [4, 6], [8, 16], [2, 24], [30, 24]] : [[34, 14], [14, 20], [10, 36], [30, 28]];
  shape(g, points, color);
}

function drawDoodleHero(g, look, [legs, flying]) {
  const { animal } = look;
  if (animal === 'capybara') {
    // Standing up, like Ethan's clay SuperCapybara: big head with a white snout, suit, legs, cape behind
    const c = { ...CLAY.capybara, ...look };
    const capePoints = flying ? [[28, 16], [3, 8], [8, 20], [2, 32], [24, 30]] : [[28, 16], [14, 26], [12, 42], [26, 38]];
    if (!c.noCape) shape(g, capePoints, c.cape);
    shape(g, ellipsePoints(25 + legs * 0.7, 43, 6, 4.5), c.fur); // legs
    shape(g, ellipsePoints(38 - legs * 0.7, 43, 6, 4.5), c.fur);
    shape(g, ellipsePoints(31, 30, 13, 12), c.suit); // body
    shape(g, [[29, 21], [36, 21], [32, 28], [37, 28], [28, 38], [30, 30], [25, 30]], c.bolt, { strokes: false });
    shape(g, ellipsePoints(43, 30, 4, 6), c.fur); // arm
    shape(g, ellipsePoints(35, 12, 13, 10), c.fur); // head
    shape(g, ellipsePoints(47, 14, 7, 5.5), c.snout); // white snout
    shape(g, ellipsePoints(27, 4, 3.5, 3.5), c.fur); // ear
    g.fillStyle(0x000000).fillCircle(38, 9, 2.4).fillCircle(52, 13, 1.6);
  } else if (animal === 'cat') {
    const c = { ...CLAY.cat, ...look };
    cape(g, flying, c.cape);
    shape(g, rectPoints(18 + legs, 34, 7, 11), c.fur);
    shape(g, rectPoints(40 - legs, 34, 7, 11), c.fur);
    pen(g, [[12, 26], [6, 18], [9, 10]], { width: 3 }); // tail
    shape(g, ellipsePoints(31, 28, 20, 11), c.suit);
    shape(g, [[27, 19], [35, 19], [30, 27], [36, 27], [26, 38], [29, 29], [23, 29]], c.bolt, { strokes: false });
    shape(g, ellipsePoints(50, 18, 11, 10), c.fur); // head
    shape(g, [[42, 12], [44, 1], [49, 9]], c.fur); // ears
    shape(g, [[52, 9], [57, 1], [58, 12]], c.fur);
    g.fillStyle(c.ear).fillTriangle(44, 10, 45, 4, 47, 9).fillTriangle(54, 9, 56, 4, 57, 10);
    g.fillStyle(0x000000).fillEllipse(48, 16, 4, 5).fillEllipse(55, 16, 4, 5);
    pen(g, [[50, 21], [52, 23], [54, 21]], { width: 1.5 });
    pen(g, [[56, 21], [63, 19]], { width: 1.2 }); // whiskers
    pen(g, [[56, 23], [63, 24]], { width: 1.2 });
  } else {
    const c = { ...CLAY.chameleon, ...look };
    cape(g, flying, look.cape ?? 0x1e88e5);
    for (const x of [20, 28, 36, 44]) shape(g, ellipsePoints(x + (x % 16 ? legs : -legs) * 0.5, 41, 4, 4), c.tail); // 4 feet
    // Curly tail on the left
    shape(g, ellipsePoints(12, 28, 10, 10), c.tail);
    pen(g, [[12, 28], [16, 27], [15, 32], [9, 31], [8, 25], [15, 22], [20, 27]], { width: 1.5 });
    shape(g, ellipsePoints(33, 30, 15, 10), c.body); // pink body
    for (const x of [26, 33, 40]) shape(g, [[x - 5, 22], [x, 11], [x + 5, 22]], c.back); // orange back
    shape(g, ellipsePoints(52, 26, 12, 10), c.head); // teal head
    shape(g, ellipsePoints(55, 23, 4.5, 4.5), c.eye);
    g.fillStyle(0x000000).fillCircle(56, 23, 1.8);
  }
}

export function createDoodleHeroTextures(scene) {
  for (const [id, look] of Object.entries(HERO_LOOKS)) {
    const prefix = doodleHeroKey(id);
    for (const [pose, values] of Object.entries(POSES)) make(scene, `${prefix}-${pose}`, 64, 48, (g) => drawDoodleHero(g, look, values), 11);
    if (!scene.anims.exists(`${prefix}-run`)) {
      scene.anims.create({ key: `${prefix}-run`, frames: [{ key: `${prefix}-run1` }, { key: `${prefix}-run2` }], frameRate: 10, repeat: -1 });
    }
  }
}

// ---------- Hats, drawn (same sizes as the normal hats in hats.js) and where they sit on the doodle heads ----------

export const DOODLE_HAT_PREFIX = 'doodle-hat-';

// Top of the head (and the eyes, for shades) in each doodle hero's 64x48 frame
const DOODLE_HEADS = {
  capybara: { top: [35, 3], eyes: [40, 9] },
  cat: { top: [50, 9], eyes: [51, 16] },
  chameleon: { top: [52, 17], eyes: [55, 23] },
};

export function doodleHatAnchor(heroId, hat, scale) {
  const look = HERO_LOOKS[heroId] ?? HERO_LOOKS['supa-capybara'];
  const head = DOODLE_HEADS[look.animal];
  const [x, y] = hat === 'shades' ? head.eyes : head.top;
  return { x: (x - 32) * scale, y: (y - 24) * scale };
}

export function createDoodleHatTextures(scene) {
  const thin = { width: 1.4, wobble: 0.5 };
  const hat = (id, width, height, draw) => make(scene, `${DOODLE_HAT_PREFIX}${id}`, width, height, draw, 5);
  const crownShape = (w, h) => [[1, h - 1], [1, h * 0.45], [w * 0.2, 1], [w * 0.35, h * 0.45], [w * 0.5, 1], [w * 0.65, h * 0.45], [w * 0.8, 1], [w - 1, h * 0.45], [w - 1, h - 1]];
  hat('crown', 22, 14, (g) => {
    const points = crownShape(22, 14);
    pencil(g, points, 0xffc107, { strokes: false });
    pen(g, points, { closed: true, ...thin });
    g.fillStyle(0xe53935).fillCircle(11, 10, 2);
  });
  hat('champion', 26, 18, (g) => {
    const points = crownShape(26, 18);
    pencil(g, points, 0xffd600, { strokes: false });
    pen(g, points, { closed: true, ...thin });
    g.fillStyle(0x00e676).fillCircle(13, 13, 2.5);
    g.fillStyle(0xd500f9).fillCircle(6, 13, 1.8).fillCircle(20, 13, 1.8);
  });
  hat('pirate', 30, 14, (g) => {
    const points = [[1, 13], [29, 13], [22, 4], [15, 1], [8, 4]];
    pencil(g, points, 0x37474f, { strokes: false });
    pen(g, points, { closed: true, ...thin });
    g.fillStyle(0xffffff).fillCircle(15, 7, 2.2);
  });
  hat('wizard', 22, 26, (g) => {
    const points = [[1, 25], [21, 25], [17, 21], [11, 1], [5, 21]];
    pencil(g, points, 0x7e57c2, { strokes: false });
    pen(g, points, { closed: true, ...thin });
    g.fillStyle(0xffeb3b).fillCircle(11, 14, 1.8).fillCircle(13, 8, 1.3);
  });
  hat('party', 16, 22, (g) => {
    const points = [[1, 21], [15, 21], [8, 4]];
    pencil(g, points, 0xff4081, { strokes: false });
    pen(g, points, { closed: true, ...thin });
    pen(g, [[4, 15], [12, 13]], { color: 0x40c4ff, width: 2, wobble: 0.4 });
    pencil(g, ellipsePoints(8, 3, 2.6, 2.6, 8), 0xffeb3b, { strokes: false });
  });
  hat('viking', 30, 16, (g) => {
    pencil(g, [[0, 2], [7, 12], [9, 7]], 0xeeeeee, { strokes: false });
    pencil(g, [[30, 2], [23, 12], [21, 7]], 0xeeeeee, { strokes: false });
    const dome = ellipsePoints(15, 15, 10, 9, 10).filter(([, y]) => y <= 15);
    pencil(g, dome, 0x90a4ae, { strokes: false });
    pen(g, dome, { closed: true, ...thin });
    pencil(g, rectPoints(4, 13, 22, 3), 0x8d6e63, { strokes: false });
  });
  hat('astronaut', 30, 26, (g) => {
    const bubble = ellipsePoints(15, 15, 13, 13, 14);
    pencil(g, bubble, 0xe1f5fe, { strokes: false });
    pen(g, bubble, { closed: true, ...thin });
    g.fillStyle(0xe53935).fillCircle(15, 2, 1.8);
  });
  hat('tophat', 20, 22, (g) => {
    const points = [[4, 1], [16, 1], [16, 18], [19, 18], [19, 21], [1, 21], [1, 18], [4, 18]];
    pencil(g, points, 0x37474f, { strokes: false });
    pen(g, points, { closed: true, ...thin });
    pen(g, [[4, 14], [16, 14]], { color: 0xd32f2f, width: 2, wobble: 0.3 });
  });
  hat('shades', 22, 8, (g) => {
    pen(g, [[0, 1], [22, 1]], { width: 1.6, wobble: 0.3 });
    pencil(g, rectPoints(1, 2, 9, 5), 0x111111, { strokes: false });
    pencil(g, rectPoints(12, 2, 9, 5), 0x111111, { strokes: false });
    pen(g, rectPoints(1, 2, 9, 5), { closed: true, width: 1, wobble: 0.3 });
    pen(g, rectPoints(12, 2, 9, 5), { closed: true, width: 1, wobble: 0.3 });
  });
}

// ---------- Bad guys from the "Bad guys" page (same sizes as the normal ones) ----------

export function createDoodleBadGuyTextures(scene) {
  // Pixel shades with little blue frames
  make(scene, 'doodle-sunglasses', 52, 22, (g) => {
    pen(g, [[2, 4], [50, 4]], { width: 2.5 });
    shape(g, [[6, 5], [22, 5], [22, 12], [18, 12], [18, 16], [12, 16], [12, 12], [6, 12]], 0x111111);
    shape(g, [[30, 5], [46, 5], [46, 12], [42, 12], [42, 16], [36, 16], [36, 12], [30, 12]], 0x111111);
    g.fillStyle(0xffffff).fillRect(9, 7, 3, 2).fillRect(33, 7, 3, 2);
  });
  // The red apple with a blaster on each side
  make(scene, 'doodle-apple', 64, 56, (g) => {
    shape(g, [[2, 30], [10, 26], [16, 46], [8, 50]], 0xffffff);
    shape(g, [[62, 30], [54, 26], [48, 46], [56, 50]], 0xffffff);
    shape(g, [[32, 14], [44, 10], [52, 22], [50, 40], [38, 52], [32, 48], [26, 52], [14, 40], [12, 22], [20, 10]], 0xe53935);
    pen(g, [[32, 14], [34, 4]], { width: 2.5 });
    shape(g, [[34, 6], [42, 2], [40, 9]], 0x43a047, { strokes: false });
  });
  // The green-yellow robot ball on stick legs, with a long arm and a blaster box
  make(scene, 'doodle-robot', 80, 56, (g) => {
    pen(g, [[22, 34], [12, 52]], { width: 2.5 });
    pen(g, [[34, 34], [40, 52], [46, 50]], { width: 2.5 });
    pen(g, [[2, 24], [18, 24]], { width: 2.5 });
    shape(g, ellipsePoints(28, 26, 11, 11), 0x9ccc65);
    pen(g, [[38, 22], [60, 18]], { width: 2.5 });
    shape(g, rectPoints(58, 10, 10, 18), 0xffffff);
    shape(g, rectPoints(68, 16, 9, 6), INK, { strokes: false });
  });
  // The horned knight: helmet with horns, red wings, armored legs
  make(scene, 'doodle-knight', 90, 80, (g) => {
    shape(g, [[45, 34], [8, 22], [10, 44]], 0xe53935); // wings
    shape(g, [[45, 34], [82, 22], [80, 44]], 0xe53935);
    pen(g, [[45, 22], [45, 52]], { width: 3 });
    pen(g, [[34, 34], [56, 34]], { width: 3 });
    pen(g, [[45, 52], [36, 70]], { width: 3 });
    pen(g, [[45, 52], [54, 70]], { width: 3 });
    shape(g, rectPoints(31, 62, 9, 14), 0x9e9e9e);
    shape(g, rectPoints(50, 62, 9, 14), 0x9e9e9e);
    shape(g, ellipsePoints(45, 16, 9, 9), 0xb0bec5); // helmet
    shape(g, [[37, 12], [30, 2], [36, 4]], 0x9e9e9e); // horns
    shape(g, [[53, 12], [60, 2], [54, 4]], 0x9e9e9e);
  });
  // A blue ink dash (the bad guys' shots)
  make(scene, 'doodle-shot', 24, 10, (g) => {
    shape(g, ellipsePoints(12, 5, 10, 3.5), 0x3949ab);
  });
}

// ---------- The bosses ----------

export function createDoodleBossTextures(scene) {
  // Pizza Boss: a pizza slice (tip down) with cheese eyes, a blaster in each hand and spiky gray legs
  make(scene, 'doodle-pizza', 140, 160, (g) => {
    pen(g, [[58, 100], [46, 132]], { width: 3 });
    pen(g, [[82, 100], [94, 132]], { width: 3 });
    shape(g, [[34, 132], [60, 132], [44, 156]], 0x9e9e9e);
    shape(g, [[80, 132], [106, 132], [96, 156]], 0x9e9e9e);
    pen(g, [[34, 40], [12, 72]], { width: 3 });
    pen(g, [[106, 40], [128, 72]], { width: 3 });
    shape(g, rectPoints(0, 66, 26, 12), 0x283593);
    shape(g, rectPoints(114, 66, 26, 12), 0x283593);
    shape(g, [[20, 22], [120, 22], [70, 116]], 0xffcc80);
    shape(g, rectPoints(16, 8, 108, 18), 0xc77a2a);
    shape(g, ellipsePoints(56, 48, 12, 12), 0xffeb3b); // cheese eyes
    shape(g, ellipsePoints(84, 50, 12, 12), 0xffeb3b);
    g.fillStyle(0x000000).fillCircle(58, 49, 4).fillCircle(82, 51, 4);
    pen(g, [[56, 78], [70, 72], [84, 78]], { width: 2.5 });
  });
  // Grape Boss: a bunch of purple grapes in a helmet net, a frown, big gray blasters and purple feet
  make(scene, 'doodle-grape', 150, 170, (g) => {
    pen(g, [[64, 124], [56, 150]], { width: 3 });
    pen(g, [[86, 124], [94, 150]], { width: 3 });
    shape(g, ellipsePoints(52, 156, 12, 9), 0x8e24aa);
    shape(g, ellipsePoints(98, 156, 12, 9), 0x8e24aa);
    pen(g, [[40, 70], [18, 90]], { width: 3 });
    pen(g, [[110, 70], [132, 90]], { width: 3 });
    shape(g, [[0, 86], [34, 80], [38, 96], [4, 104]], 0x9e9e9e);
    shape(g, [[150, 86], [116, 80], [112, 96], [146, 104]], 0x9e9e9e);
    for (const [x, y] of [[50, 40], [75, 34], [100, 40], [42, 62], [66, 60], [90, 60], [110, 64], [54, 84], [78, 84], [100, 86], [64, 104], [88, 106], [76, 122]]) {
      shape(g, ellipsePoints(x, y, 14, 13, 14), 0x8e24aa);
    }
    pen(g, [[38, 30], [75, 14], [112, 30]], { width: 2 }); // helmet net
    pen(g, [[50, 22], [60, 38]], { width: 1.5 });
    pen(g, [[75, 14], [75, 34]], { width: 1.5 });
    pen(g, [[100, 22], [90, 38]], { width: 1.5 });
    pen(g, [[80, 12], [86, 2]], { width: 2 }); // antenna
    g.fillStyle(0x000000).fillCircle(66, 66, 4).fillCircle(86, 66, 4);
    pen(g, [[64, 86], [76, 80], [88, 86]], { width: 2.5 }); // frown
  });
  // The PIZZA-GRAPE MONSTER: a giant pizza slice with grapes growing all over it and an angry face
  make(scene, 'doodle-monster', 220, 210, (g) => {
    for (const [x1, x2] of [[70, 50], [150, 170]]) {
      pen(g, [[x1, 150], [x2, 196]], { width: 4 });
      shape(g, ellipsePoints(x2, 200, 16, 9), 0x8e24aa);
    }
    shape(g, rectPoints(0, 90, 40, 18), 0x9e9e9e);
    shape(g, rectPoints(180, 90, 40, 18), 0x283593);
    pen(g, [[36, 98], [56, 70]], { width: 4 });
    pen(g, [[184, 98], [164, 70]], { width: 4 });
    shape(g, [[30, 34], [190, 34], [110, 170]], 0xffcc80);
    shape(g, rectPoints(24, 16, 172, 22), 0xc77a2a);
    for (const [x, y] of [[44, 14], [70, 6], [100, 4], [130, 6], [158, 10], [180, 18], [60, 96], [150, 100], [110, 132]]) {
      shape(g, ellipsePoints(x, y, 13, 12, 14), 0x8e24aa);
    }
    shape(g, ellipsePoints(84, 64, 16, 14), 0xffeb3b);
    shape(g, ellipsePoints(136, 64, 16, 14), 0xffeb3b);
    g.fillStyle(0xd50000).fillCircle(86, 66, 6).fillCircle(134, 66, 6);
    pen(g, [[70, 46], [98, 56]], { width: 4 }); // angry eyebrows
    pen(g, [[150, 46], [122, 56]], { width: 4 });
    shape(g, [[86, 98], [134, 98], [124, 116], [96, 116]], 0x4a0000, { strokes: false });
    g.fillStyle(0xffffff).fillTriangle(94, 99, 102, 99, 98, 106).fillTriangle(118, 99, 126, 99, 122, 106);
  });
  // A spinning pizza slice (the boomerang) and a grape bomb
  make(scene, 'doodle-slice', 44, 44, (g) => {
    shape(g, [[4, 6], [40, 6], [22, 42]], 0xffcc80);
    shape(g, rectPoints(2, 2, 40, 7), 0xc77a2a);
    g.fillStyle(0xd84315).fillCircle(16, 16, 3).fillCircle(27, 15, 3).fillCircle(22, 26, 3);
  });
  make(scene, 'doodle-grapebomb', 30, 34, (g) => {
    pen(g, [[15, 8], [18, 1]], { width: 2 });
    for (const [x, y] of [[10, 14], [20, 14], [15, 22], [8, 24], [22, 24], [15, 30]]) shape(g, ellipsePoints(x, y, 6, 6, 10), 0x8e24aa, { strokes: false });
  });
}

// ---------- The magic pencil's bomb ----------

export function createDoodleBombTexture(scene) {
  make(scene, 'doodle-bomb', 64, 64, (g) => {
    shape(g, ellipsePoints(28, 38, 22, 22), 0x263238);
    shape(g, rectPoints(22, 12, 12, 8), 0x607d8b);
    pen(g, [[28, 12], [36, 4], [46, 6]], { width: 2.5, color: 0x6d4c41 });
    shape(g, [[46, 0], [52, 6], [46, 12], [40, 6]], 0xffa000, { strokes: false });
    g.fillStyle(0xffffff, 0.7).fillCircle(20, 30, 4);
  });
}

// ---------- The magic pencil's other drawings: a rocket and a tornado (the rainbow bridge is drawn live) ----------

export function createDoodlePencilTextures(scene) {
  make(scene, 'doodle-rocket', 40, 70, (g) => {
    shape(g, [[20, 2], [30, 16], [30, 50], [20, 56], [10, 50], [10, 16]], 0xeceff1);
    shape(g, [[20, 2], [30, 16], [10, 16]], 0xe53935, { strokes: false });
    shape(g, [[10, 40], [2, 56], [10, 52]], 0xe53935, { strokes: false });
    shape(g, [[30, 40], [38, 56], [30, 52]], 0xe53935, { strokes: false });
    shape(g, ellipsePoints(20, 28, 5, 5), 0x4fc3f7);
    shape(g, [[13, 56], [27, 56], [20, 70]], 0xff9800, { strokes: false });
  });
  make(scene, 'doodle-tornado', 90, 120, (g) => {
    const funnel = [[4, 6], [86, 6], [64, 40], [72, 64], [52, 88], [56, 104], [44, 118], [36, 104], [40, 88], [22, 64], [28, 40]];
    shape(g, funnel, 0xb0bec5);
    for (const [y, half] of [[20, 34], [44, 22], [68, 16], [92, 9]]) pen(g, [[45 - half, y], [45 + half, y + 4]], { width: 1.5 });
  });
}

// Spread dots evenly along a line through points (for the pencil's dotted outlines)
function dotsAlong(points, count) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(length);
    total += length;
  }
  return Array.from({ length: count }, (_, k) => {
    let distance = (k / (count - 1)) * total;
    let i = 0;
    while (i < lengths.length - 1 && distance > lengths[i]) distance -= lengths[i++];
    const t = lengths[i] ? distance / lengths[i] : 0;
    return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t];
  });
}

const RAINBOW_ARC = Array.from({ length: 13 }, (_, i) => {
  const angle = Math.PI + (i / 12) * Math.PI;
  return [100 + Math.cos(angle) * 80, 160 + Math.sin(angle) * 80];
});
const ROCKET_OUTLINE = [[100, 20], [120, 45], [128, 75], [128, 130], [152, 168], [118, 155], [100, 172], [82, 155], [48, 168], [72, 130], [72, 75], [80, 45], [100, 20]];
const TORNADO_ZIGZAG = [[40, 35], [160, 35], [60, 70], [150, 80], [72, 108], [138, 116], [88, 145], [122, 152], [100, 182]];

// What the pencil can draw: the dots to trace (in a 200x200 box) for each one
export const PENCIL_DRAWINGS = {
  bomb: { icon: '💣' },
  bridge: { icon: '🌈', trace: dotsAlong(RAINBOW_ARC, 22) },
  rocket: { icon: '🚀', trace: dotsAlong(ROCKET_OUTLINE, 28) },
  tornado: { icon: '🌪️', trace: dotsAlong(TORNADO_ZIGZAG, 26) },
};

// The path to trace for the magic pencil's bomb (in a 200x200 box): the round bomb, then its fuse
export const BOMB_TRACE = [
  ...Array.from({ length: 24 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / 24) * Math.PI * 2;
    return [100 + Math.cos(angle) * 70, 115 + Math.sin(angle) * 70];
  }),
  [100, 45],
  [108, 30],
  [122, 20],
  [138, 18],
  [150, 22],
];
PENCIL_DRAWINGS.bomb.trace = BOMB_TRACE;
