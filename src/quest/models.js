import * as THREE from 'three';

// 3D models for the Cube Islands. Everything is made of cubes, like in Pokémon Quest.

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, ...options });
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

// The baby colors and what each one shoots (Ethan's design: the color gives the power)
export const BABY_COLORS = {
  red: { body: 0xff5a4f, shot: 0xff6d00 }, // fire
  blue: { body: 0x4fa8ff, shot: 0x80d8ff }, // ice
  yellow: { body: 0xffd54f, shot: 0xfff176 }, // lightning
  green: { body: 0x66bb6a, shot: 0x2e7d32 }, // vines that trap
  pink: { body: 0xff8fc8, shot: 0xff4081 }, // heals you
  purple: { body: 0xab47bc, shot: 0xe1bee7 }, // ghost balls
  rainbow: { body: 0xffffff, shot: 0xffffff }, // all the powers (each part a different color)
  alien: { body: 0x76ff03, shot: 0x76ff03 }, // from World 2's spaceship: shrink rays from a mini saucer
};
const RAINBOW = [0xff5252, 0xffa726, 0xffee58, 0x66bb6a, 0x42a5f5, 0xab47bc];

// A baby cat or baby capybara. Returns { group, legs }.
export function makeBaby(animal, color) {
  if (animal === 'alien') return makeAlienBaby();
  // Rainbow babies get a different color for every part
  let part = 0;
  const body = () => (color === 'rainbow' ? RAINBOW[part++ % RAINBOW.length] : BABY_COLORS[color].body);
  const group = new THREE.Group();
  const cat = animal === 'cat';
  group.add(box(0.6, 0.45, 0.8, body(), 0, 0.42, 0));
  const head = new THREE.Group();
  head.position.set(0, 0.85, 0.35);
  head.add(box(cat ? 0.6 : 0.65, 0.55, 0.55, body()));
  if (cat) {
    head.add(box(0.16, 0.2, 0.1, body(), -0.2, 0.36, 0));
    head.add(box(0.16, 0.2, 0.1, body(), 0.2, 0.36, 0));
    head.add(box(0.1, 0.1, 0.1, 0xff8fb1, -0.2, 0.34, 0.03));
    head.add(box(0.1, 0.1, 0.1, 0xff8fb1, 0.2, 0.34, 0.03));
  } else {
    head.add(box(0.12, 0.1, 0.1, 0x6d4c41, -0.24, 0.32, -0.1));
    head.add(box(0.12, 0.1, 0.1, 0x6d4c41, 0.24, 0.32, -0.1));
    head.add(box(0.45, 0.3, 0.2, 0x8d6e63, 0, -0.08, 0.32)); // the big capybara snout
    head.add(box(0.08, 0.06, 0.04, 0x3e2723, -0.1, -0.02, 0.43));
    head.add(box(0.08, 0.06, 0.04, 0x3e2723, 0.1, -0.02, 0.43));
  }
  // Big baby eyes
  for (const side of [-1, 1]) {
    head.add(box(0.16, 0.18, 0.04, 0xffffff, side * 0.15, 0.08, 0.28));
    head.add(box(0.09, 0.11, 0.04, 0x111111, side * 0.15, 0.06, 0.3));
  }
  group.add(head);
  if (cat) {
    const tail = box(0.1, 0.1, 0.5, body(), 0, 0.6, -0.55);
    tail.rotation.x = -0.6;
    group.add(tail);
  }
  const legs = [-1, 1].flatMap((side) =>
    [-0.25, 0.25].map((z) => {
      const leg = box(0.16, 0.25, 0.16, body(), side * 0.18, 0.12, z);
      group.add(leg);
      return leg;
    }),
  );
  return { group, legs };
}

// The alien baby rides a mini flying saucer (it has no legs to walk with).
function makeAlienBaby() {
  const group = new THREE.Group();
  const green = 0x76ff03;
  group.add(box(1.3, 0.2, 1.3, 0xb0bec5, 0, 0.1, 0)); // the saucer
  group.add(box(0.9, 0.15, 0.9, 0x78909c, 0, -0.05, 0));
  for (const [x, z] of [[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]]) group.add(box(0.12, 0.08, 0.12, 0xffeb3b, x, 0.02, z));
  group.add(box(0.4, 0.4, 0.35, green, 0, 0.4, 0));
  const head = new THREE.Group();
  head.position.set(0, 0.85, 0.05);
  head.add(box(0.6, 0.5, 0.5, green));
  head.add(box(0.2, 0.25, 0.05, 0x111111, -0.15, 0.03, 0.26)); // big black alien eyes
  head.add(box(0.2, 0.25, 0.05, 0x111111, 0.15, 0.03, 0.26));
  head.add(box(0.04, 0.3, 0.04, green, -0.15, 0.38, 0)); // antennas
  head.add(box(0.04, 0.3, 0.04, green, 0.15, 0.38, 0));
  head.add(box(0.1, 0.1, 0.1, 0xff4081, -0.15, 0.55, 0));
  head.add(box(0.1, 0.1, 0.1, 0xff4081, 0.15, 0.55, 0));
  group.add(head);
  return { group, legs: [] };
}

// Cooking food. Its color decides which baby comes: red berry, blue mushroom, yellow corn.
export function makeFood(color) {
  const group = new THREE.Group();
  if (color === 'red') {
    group.add(box(0.45, 0.45, 0.45, 0xe53935, 0, 0.25, 0));
    group.add(box(0.3, 0.1, 0.3, 0x43a047, 0, 0.52, 0));
  } else if (color === 'blue') {
    group.add(box(0.2, 0.35, 0.2, 0xfafafa, 0, 0.18, 0));
    group.add(box(0.6, 0.25, 0.6, 0x1e88e5, 0, 0.45, 0));
    group.add(box(0.12, 0.05, 0.12, 0xffffff, 0.15, 0.58, 0.1));
  } else if (color === 'yellow') {
    group.add(box(0.3, 0.7, 0.3, 0xfdd835, 0, 0.4, 0));
    group.add(box(0.1, 0.5, 0.36, 0x7cb342, 0.18, 0.3, 0));
    group.add(box(0.1, 0.5, 0.36, 0x7cb342, -0.18, 0.3, 0));
  } else if (color === 'green') {
    // Kiwi: brown outside, green inside
    group.add(box(0.5, 0.45, 0.5, 0x8d6e63, 0, 0.25, 0));
    group.add(box(0.4, 0.36, 0.05, 0x9ccc65, 0, 0.25, 0.26));
    group.add(box(0.1, 0.1, 0.06, 0xfffde7, 0, 0.25, 0.27));
  } else if (color === 'pink') {
    // Wrapped candy
    group.add(box(0.5, 0.35, 0.35, 0xff4fa3, 0, 0.3, 0));
    group.add(box(0.15, 0.3, 0.3, 0xffb3d9, 0.32, 0.3, 0));
    group.add(box(0.15, 0.3, 0.3, 0xffb3d9, -0.32, 0.3, 0));
  } else {
    // Eggplant
    group.add(box(0.36, 0.6, 0.36, 0x6a1b9a, 0, 0.35, 0));
    group.add(box(0.28, 0.15, 0.28, 0x7b1fa2, 0, 0.05, 0));
    group.add(box(0.3, 0.1, 0.3, 0x558b2f, 0, 0.7, 0));
    group.add(box(0.08, 0.15, 0.08, 0x558b2f, 0, 0.8, 0));
  }
  return group;
}

// The rainbow egg the Block Dragon sometimes drops (stripes of every color).
export function makeEgg() {
  const group = new THREE.Group();
  const widths = [0.5, 0.7, 0.8, 0.8, 0.7, 0.5];
  widths.forEach((w, i) => group.add(box(w, 0.18, w, RAINBOW[i], 0, 0.1 + i * 0.18, 0)));
  return group;
}

// The cooking pot at base camp. Returns { group, soup } so the soup can bubble.
export function makePot() {
  const group = new THREE.Group();
  group.add(box(2.4, 1.4, 2.4, 0x424242, 0, 1.1, 0));
  group.add(box(2.7, 0.25, 2.7, 0x616161, 0, 1.85, 0));
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) group.add(box(0.3, 0.5, 0.3, 0x424242, x, 0.25, z));
  // Fire under the pot
  group.add(box(0.5, 0.4, 0.5, 0xff6d00, 0, 0.25, 0));
  group.add(box(0.3, 0.3, 0.3, 0xffd600, 0.3, 0.2, 0.2));
  const soup = box(2.1, 0.1, 2.1, 0xfff3e0, 0, 1.82, 0);
  group.add(soup);
  return { group, soup };
}

// A launch pad that sends you on a mission (or back to base). The floating cube spins.
export function makePad(color) {
  const group = new THREE.Group();
  group.add(box(3, 0.3, 3, 0xeeeeee, 0, 0.15, 0));
  group.add(box(2.4, 0.32, 2.4, color, 0, 0.17, 0));
  const cube = box(0.7, 0.7, 0.7, color, 0, 2.2, 0);
  cube.material.emissive = new THREE.Color(color);
  cube.material.emissiveIntensity = 0.5;
  group.add(cube);
  return { group, cube };
}

// A word floating in the air (island names over the pads).
export function makeLabel(text, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  let size = 60;
  do {
    ctx.font = `bold ${size}px Arial Black, Arial`;
    size -= 4;
  } while (ctx.measureText(text).width > 480 && size > 20); // long names get smaller
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, 256, 64);
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(6, 1.5, 1);
  return sprite;
}

export function makeTree(seed) {
  const group = new THREE.Group();
  const height = 2 + (seed % 2);
  group.add(box(0.7, height, 0.7, 0x795548, 0, height / 2, 0));
  const leaves = [0x43a047, 0x2e7d32, 0x66bb6a][seed % 3];
  group.add(box(2.4, 1.6, 2.4, leaves, 0, height + 0.6, 0));
  group.add(box(1.4, 0.9, 1.4, leaves, 0, height + 1.8, 0));
  return group;
}

// Blocky robot bad guy. Returns { group, legs }.
export function makeCubeRobot() {
  const group = new THREE.Group();
  group.add(box(1, 0.9, 0.8, 0x78909c, 0, 0.75, 0));
  group.add(box(0.8, 0.6, 0.7, 0x90a4ae, 0, 1.5, 0));
  group.add(box(0.2, 0.12, 0.05, 0xff1744, -0.18, 1.55, 0.36));
  group.add(box(0.2, 0.12, 0.05, 0xff1744, 0.18, 1.55, 0.36));
  group.add(box(0.06, 0.35, 0.06, 0x455a64, 0, 1.95, 0));
  group.add(box(0.15, 0.15, 0.15, 0xffeb3b, 0, 2.15, 0));
  const legs = [-0.25, 0.25].map((x) => {
    const leg = box(0.25, 0.35, 0.3, 0x546e7a, x, 0.17, 0);
    group.add(leg);
    return leg;
  });
  return { group, legs };
}

// The Block Dragon: steals baby cats and capybaras. Returns { group, eyes, wings, jaw }.
export function makeDragon() {
  const group = new THREE.Group();
  const green = 0x2e7d32;
  const belly = 0xffb74d;
  group.add(box(3.2, 2.4, 5, green, 0, 2.2, 0));
  group.add(box(2.4, 1.2, 4, belly, 0, 1.4, 0.2));
  for (const [x, z] of [[-1.2, 1.6], [1.2, 1.6], [-1.2, -1.6], [1.2, -1.6]]) group.add(box(0.9, 1.4, 0.9, green, x, 0.7, z));
  // Neck and head
  group.add(box(1.4, 2, 1.4, green, 0, 3.8, 2.4));
  const head = new THREE.Group();
  head.position.set(0, 5, 3.4);
  head.add(box(2, 1.4, 2.2, green));
  head.add(box(1.6, 0.6, 1.4, green, 0, -0.2, 1.5)); // snout
  head.add(box(0.3, 0.3, 0.1, 0x1b5e20, -0.4, 0.05, 2.2));
  head.add(box(0.3, 0.3, 0.1, 0x1b5e20, 0.4, 0.05, 2.2));
  const jaw = box(1.5, 0.35, 1.4, 0x1b5e20, 0, -0.65, 1.3);
  head.add(jaw);
  for (const side of [-1, 1]) head.add(box(0.3, 0.8, 0.3, 0xfafafa, side * 0.6, 1, -0.5)); // horns
  const eyes = [-1, 1].map((side) => {
    const eye = box(0.4, 0.4, 0.1, 0xffeb3b, side * 0.6, 0.3, 1.11);
    eye.add(box(0.15, 0.3, 0.05, 0x000000, 0, 0, 0.05));
    head.add(eye);
    return eye;
  });
  group.add(head);
  // Spikes down the back and a long tail
  for (let i = 0; i < 4; i++) group.add(box(0.4, 0.6, 0.6, 0xff7043, 0, 3.6, 1.5 - i * 1.1));
  group.add(box(1, 1, 3, green, 0, 1.8, -3.8));
  group.add(box(0.6, 0.6, 2, green, 0, 1.5, -6));
  group.add(box(0.8, 0.8, 0.4, 0xff7043, 0, 1.5, -7.1));
  const wings = [-1, 1].map((side) => {
    const wing = new THREE.Group();
    wing.position.set(side * 1.6, 3.3, 0);
    wing.add(box(3.5, 0.2, 3, 0x66bb6a, side * 1.75, 0, 0));
    group.add(wing);
    return wing;
  });
  return { group, eyes, wings, jaw };
}

// A cage with a baby inside. Returns { group, bars } so the bars can open.
export function makeCage() {
  const group = new THREE.Group();
  group.add(box(1.8, 0.2, 1.8, 0x5d4037, 0, 0.1, 0));
  group.add(box(1.8, 0.2, 1.8, 0x5d4037, 0, 2.1, 0));
  const bars = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    for (let j = -1; j <= 1; j++) {
      const bar = box(0.08, 1.8, 0.08, 0x9e9e9e, j * 0.55, 1.1, 0.85);
      const side = new THREE.Group();
      side.rotation.y = (i * Math.PI) / 2;
      side.add(bar);
      bars.add(side);
    }
  }
  group.add(bars);
  return { group, bars };
}

// ---------- Island bad guys. Each returns { group, legs } (legs can be empty). ----------

// Sunny Beach: a crab that scuttles sideways
export function makeCrab() {
  const group = new THREE.Group();
  group.add(box(1.2, 0.45, 0.8, 0xff5722, 0, 0.5, 0));
  for (const side of [-1, 1]) {
    group.add(box(0.35, 0.3, 0.35, 0xff7043, side * 0.8, 0.65, 0.45)); // claws
    group.add(box(0.08, 0.35, 0.08, 0xff5722, side * 0.2, 0.85, 0.25)); // eye stalks
    group.add(box(0.14, 0.14, 0.14, 0x111111, side * 0.2, 1.05, 0.25));
  }
  const legs = [-1, 1].flatMap((side) =>
    [-0.25, 0, 0.25].map((z) => {
      const leg = box(0.4, 0.08, 0.08, 0xe64a19, side * 0.75, 0.3, z);
      group.add(leg);
      return leg;
    }),
  );
  return { group, legs };
}

// Frosty Forest: a snowman who throws snowballs
export function makeSnowman() {
  const group = new THREE.Group();
  group.add(box(1.2, 1, 1.2, 0xfafafa, 0, 0.5, 0));
  group.add(box(0.9, 0.8, 0.9, 0xffffff, 0, 1.4, 0));
  group.add(box(0.7, 0.6, 0.7, 0xfafafa, 0, 2.1, 0));
  group.add(box(0.12, 0.12, 0.4, 0xff9800, 0, 2.1, 0.5)); // carrot nose
  for (const side of [-1, 1]) {
    group.add(box(0.1, 0.1, 0.05, 0x111111, side * 0.16, 2.25, 0.36));
    const arm = box(0.8, 0.08, 0.08, 0x6d4c41, side * 0.8, 1.5, 0);
    arm.rotation.z = side * 0.4;
    group.add(arm);
  }
  group.add(box(0.8, 0.1, 0.8, 0x212121, 0, 2.45, 0)); // hat
  group.add(box(0.5, 0.4, 0.5, 0x212121, 0, 2.7, 0));
  return { group, legs: [] };
}

// Dragon Island: a fast baby lizard
export function makeLizard() {
  const group = new THREE.Group();
  group.add(box(0.5, 0.35, 1.1, 0x9ccc65, 0, 0.35, 0));
  group.add(box(0.45, 0.35, 0.45, 0x9ccc65, 0, 0.5, 0.7));
  group.add(box(0.1, 0.1, 0.05, 0xd50000, -0.13, 0.58, 0.93));
  group.add(box(0.1, 0.1, 0.05, 0xd50000, 0.13, 0.58, 0.93));
  group.add(box(0.2, 0.15, 0.8, 0x7cb342, 0, 0.3, -0.9));
  const legs = [-1, 1].flatMap((side) =>
    [-0.3, 0.3].map((z) => {
      const leg = box(0.15, 0.2, 0.15, 0x7cb342, side * 0.3, 0.1, z);
      group.add(leg);
      return leg;
    }),
  );
  return { group, legs };
}

// Candy Island: a bouncy gummy bear (see-through, like real gummies)
export function makeGummyBear(seed) {
  const color = [0xff1744, 0x00e676, 0xffea00, 0xff9100][seed % 4];
  const gummy = new THREE.MeshStandardMaterial({ color, flatShading: true, transparent: true, opacity: 0.8 });
  const part = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gummy);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const group = new THREE.Group();
  part(0.9, 0.9, 0.7, 0, 0.6, 0);
  part(0.7, 0.6, 0.6, 0, 1.35, 0);
  part(0.2, 0.2, 0.15, -0.28, 1.72, 0);
  part(0.2, 0.2, 0.15, 0.28, 1.72, 0);
  group.add(box(0.09, 0.09, 0.05, 0x111111, -0.14, 1.42, 0.31));
  group.add(box(0.09, 0.09, 0.05, 0x111111, 0.14, 1.42, 0.31));
  const legs = [-0.25, 0.25].map((x) => part(0.25, 0.3, 0.3, x, 0.15, 0));
  return { group, legs };
}

// The Block Dragon's helper: a little flying dragon that drops fireballs. Its wings are the "legs" (they flap).
export function makeMiniDragon() {
  const group = new THREE.Group();
  const red = 0xd84315;
  group.add(box(0.8, 0.6, 1.4, red, 0, 0, 0));
  group.add(box(0.6, 0.5, 0.6, red, 0, 0.3, 0.9));
  group.add(box(0.12, 0.12, 0.05, 0xffeb3b, -0.15, 0.4, 1.21));
  group.add(box(0.12, 0.12, 0.05, 0xffeb3b, 0.15, 0.4, 1.21));
  group.add(box(0.25, 0.25, 0.9, red, 0, 0, -1.1));
  const legs = [-1, 1].map((side) => {
    const wing = new THREE.Group();
    wing.position.set(side * 0.4, 0.2, 0);
    wing.add(box(1.2, 0.08, 0.9, 0xff8a65, side * 0.6, 0, 0));
    group.add(wing);
    return wing;
  });
  return { group, legs };
}

// Candy Island trees: giant lollipops
export function makeLollipop(seed) {
  const group = new THREE.Group();
  group.add(box(0.25, 3, 0.25, 0xfafafa, 0, 1.5, 0));
  const colors = [0xff4081, 0x7c4dff, 0x18ffff, 0xffd740];
  group.add(box(2, 2, 0.4, colors[seed % 4], 0, 3.8, 0));
  group.add(box(1.2, 1.2, 0.45, colors[(seed + 1) % 4], 0, 3.8, 0));
  group.add(box(0.5, 0.5, 0.5, 0xffffff, 0, 3.8, 0));
  return group;
}

// The food shop at base camp: a counter with a striped roof and crates of kiwis and eggplants.
export function makeShop() {
  const group = new THREE.Group();
  group.add(box(3, 1.2, 1.4, 0x8d6e63, 0, 0.6, 0));
  for (const x of [-1.4, 1.4]) group.add(box(0.15, 2.6, 0.15, 0x6d4c41, x, 1.3, -0.6));
  for (let i = 0; i < 5; i++) group.add(box(0.62, 0.15, 1.8, i % 2 ? 0xffffff : 0xe53935, -1.24 + i * 0.62, 2.7, 0));
  group.add(box(0.8, 0.4, 0.8, 0x6d4c41, -0.7, 1.4, 0));
  group.add(box(0.8, 0.4, 0.8, 0x6d4c41, 0.7, 1.4, 0));
  for (const x of [-0.85, -0.55]) group.add(box(0.25, 0.25, 0.25, 0x9ccc65, x, 1.7, 0)); // kiwis
  for (const x of [0.55, 0.85]) group.add(box(0.2, 0.4, 0.2, 0x6a1b9a, x, 1.75, 0)); // eggplants
  return group;
}

// The team tent at base camp: walk in to pick your 3 babies.
export function makeTent() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const wall = box(0.15, 2.6, 3, 0x29b6f6, side * 0.9, 1.1, 0);
    wall.rotation.z = side * 0.6;
    group.add(wall);
  }
  group.add(box(0.15, 0.15, 3.1, 0xffd54f, 0, 2.2, 0));
  group.add(box(0.8, 0.6, 0.05, 0xffd54f, 0, 0.9, -1.4)); // a little sign at the back
  return group;
}
