import * as THREE from 'three';
import { PALETTES } from '../art/heroes.js';

// 3D models for World 2, built from simple shapes (no model files).
// Every model faces +Z (forward) with +Y up, standing on y = 0.

const materials = new Map();
function mat(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, ...options }));
  return materials.get(key);
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

function ball(radius, color, x = 0, y = 0, z = 0, options) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), mat(color, options));
  mesh.position.set(x, y, z);
  return mesh;
}

// ---------- Heroes ----------

const CAPE = 0x3b8de2;
const BOLT = 0xffd23f;

const HERO_LOOKS = {
  'supa-capybara': { animal: 'capybara', suit: 0xd8343f, suitDark: 0x9e1f2a },
  'ultra-capybara': { animal: 'capybara', suit: 0xe0457b, suitDark: 0xa3204f },
  'golden-capybara': { animal: 'capybara', suit: 0xffc107, suitDark: 0xff8f00, cape: 0xfff176 },
  'supa-cat': { animal: 'cat', suit: 0xb5452f, suitDark: 0x7f2c1d, fur: 0xffffff },
  'bloodmoon-cat': { animal: 'cat', suit: 0x6a1b4d, suitDark: 0x400f2e, fur: 0xf3e5f5 },
  'supa-chameleon': { animal: 'chameleon', suit: 0xf06292, suitDark: 0x3e7d1f },
};

function boltShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0.05, 0.22);
  shape.lineTo(-0.1, -0.02);
  shape.lineTo(0.02, -0.02);
  shape.lineTo(-0.06, -0.24);
  shape.lineTo(0.12, 0.04);
  shape.lineTo(0, 0.04);
  shape.lineTo(0.1, 0.22);
  return new THREE.ShapeGeometry(shape);
}

// Where the top of the head and the eyes are on each 3D animal (for hats).
const HEAD_3D = {
  capybara: { top: [0, 1.13, 0.62], eyes: [0, 0.98, 0.95] },
  cat: { top: [0, 1.28, 0.6], eyes: [0, 1.02, 0.92] },
  chameleon: { top: [0, 1.12, 0.6], eyes: [0, 0.9, 0.78] },
};

// A 3D hat or costume, sitting on y = 0.
export function makeHat3D(hat) {
  const group = new THREE.Group();
  if (hat === 'crown') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 8, 1, true), mat(0xffc107, { side: THREE.DoubleSide }));
    band.position.y = 0.07;
    group.add(band);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), mat(0xffc107));
      const angle = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.2, 0.2, Math.sin(angle) * 0.2);
      group.add(spike);
    }
    group.add(ball(0.04, 0xe53935, 0, 0.08, 0.22));
  } else if (hat === 'pirate') {
    const hatMesh = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.25, 3), mat(0x212121));
    hatMesh.position.y = 0.12;
    hatMesh.rotation.y = Math.PI / 6;
    group.add(hatMesh);
    group.add(ball(0.05, 0xffffff, 0, 0.12, 0.17));
  } else if (hat === 'wizard') {
    group.add(box(0.5, 0.04, 0.5, 0x5e35b1, 0, 0.02, 0));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 8), mat(0x5e35b1));
    cone.position.y = 0.3;
    group.add(cone);
    group.add(ball(0.04, 0xffeb3b, 0.05, 0.3, 0.15));
  } else if (hat === 'party') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), mat(0xff4081));
    cone.position.y = 0.2;
    group.add(cone);
    group.add(ball(0.06, 0xffeb3b, 0, 0.42, 0));
  } else if (hat === 'shades') {
    group.add(box(0.5, 0.05, 0.04, 0x111111, 0, 0.06, 0));
    group.add(box(0.2, 0.12, 0.05, 0x111111, -0.13, 0, 0));
    group.add(box(0.2, 0.12, 0.05, 0x111111, 0.13, 0, 0));
  }
  return group;
}

// Returns { group, legs, cape } so the game can animate running. palette: secret colors (see art/heroes.js).
// hat: optional hat to wear. colors: optional suit/suitDark/cape override (Evil Capybara).
export function makeHero(id, palette = 0, hat = null, colors = null) {
  const look = { ...(HERO_LOOKS[id] ?? HERO_LOOKS['supa-capybara']), ...PALETTES[palette], ...colors };
  const group = new THREE.Group();
  const legs = [];

  for (const [x, z] of [[-0.25, 0.3], [0.25, 0.3], [-0.25, -0.3], [0.25, -0.3]]) {
    const leg = box(0.16, 0.35, 0.16, look.suitDark, x, 0.18, z);
    legs.push(leg);
    group.add(leg);
  }

  // Body in the suit, with a lightning bolt on each side
  group.add(box(0.7, 0.5, 1.0, look.suit, 0, 0.58, 0));
  for (const side of [-1, 1]) {
    const bolt = new THREE.Mesh(boltShape(), new THREE.MeshBasicMaterial({ color: BOLT, side: THREE.DoubleSide }));
    bolt.position.set(side * 0.36, 0.6, 0);
    bolt.rotation.y = side * Math.PI / 2;
    group.add(bolt);
  }

  if (look.animal === 'capybara') {
    group.add(box(0.55, 0.5, 0.6, 0x9b6b3d, 0, 0.88, 0.62));
    group.add(box(0.42, 0.32, 0.25, 0x6e4a2a, 0, 0.8, 0.98)); // snout
    group.add(box(0.12, 0.12, 0.1, 0x6e4a2a, -0.2, 1.17, 0.5)); // ears
    group.add(box(0.12, 0.12, 0.1, 0x6e4a2a, 0.2, 1.17, 0.5));
    group.add(ball(0.06, 0x000000, -0.2, 0.98, 0.93));
    group.add(ball(0.06, 0x000000, 0.2, 0.98, 0.93));
  } else if (look.animal === 'cat') {
    group.add(ball(0.33, look.fur, 0, 0.98, 0.6));
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), mat(look.fur));
      ear.position.set(side * 0.18, 1.32, 0.58);
      group.add(ear);
      group.add(ball(0.05, 0x000000, side * 0.12, 1.02, 0.9));
    }
    group.add(ball(0.05, 0xff6f9c, 0, 0.93, 0.93)); // nose
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7), mat(look.fur));
    tail.position.set(0, 0.95, -0.55);
    tail.rotation.x = -0.4;
    group.add(tail);
  } else {
    // Chameleon: green head with a big eye, and a curly tail
    group.add(ball(0.32, 0x7cc242, 0, 0.82, 0.6));
    for (const side of [-1, 1]) {
      group.add(ball(0.13, 0xffffff, side * 0.25, 0.9, 0.65));
      group.add(ball(0.06, 0x000000, side * 0.33, 0.9, 0.7));
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 6, 16), mat(0x7cc242));
    tail.position.set(0, 0.55, -0.7);
    tail.rotation.y = Math.PI / 2;
    group.add(tail);
  }

  // Blue cape from the neck down the back
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.9), new THREE.MeshStandardMaterial({ color: look.cape ?? CAPE, side: THREE.DoubleSide }));
  cape.geometry.translate(0, -0.45, 0);
  cape.position.set(0, 0.88, -0.1);
  cape.rotation.x = 0.5;
  group.add(cape);

  if (hat) {
    const head = HEAD_3D[look.animal];
    const hatMesh = makeHat3D(hat);
    hatMesh.position.set(...(hat === 'shades' ? head.eyes : head.top));
    group.add(hatMesh);
  }

  return { group, legs, cape };
}

// Ultra Capybara's pink fire aura.
export function makeAura(color = 0xff4fd8) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false }),
  );
}

// ---------- Space bad guys (World 1 bad guys in astronaut helmets) ----------

function helmet(radius, y) {
  return ball(radius, 0xbbefff, 0, y, 0, { transparent: true, opacity: 0.3, roughness: 0.1 });
}

export function makeApple() {
  const group = new THREE.Group();
  group.add(ball(0.45, 0xe03a3a, 0, 0.5, 0));
  group.add(box(0.05, 0.2, 0.05, 0x6b3e1e, 0, 1.0, 0));
  group.add(box(0.2, 0.05, 0.1, 0x4caf50, 0.1, 1.05, 0));
  for (const side of [-1, 1]) {
    group.add(ball(0.09, 0xffffff, side * 0.15, 0.6, 0.38));
    group.add(ball(0.045, 0x000000, side * 0.15, 0.6, 0.46));
    group.add(box(0.35, 0.14, 0.14, 0x444455, side * 0.6, 0.45, 0)); // blasters
  }
  group.add(helmet(0.75, 0.55));
  return group;
}

export function makeRobot() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), mat(0x1a2a6c));
    leg.position.set(side * 0.25, 0.3, 0);
    leg.rotation.z = side * 0.3;
    group.add(leg);
  }
  group.add(ball(0.38, 0x8fd14f, 0, 0.8, 0));
  group.add(ball(0.2, 0x6cc0c9, 0, 0.75, 0.25));
  group.add(box(0.5, 0.06, 0.06, 0x1a2a6c, 0, 0.8, 0.45)); // arm
  group.add(box(0.2, 0.2, 0.35, 0x1a2a6c, 0, 0.8, 0.7)); // blaster pointing forward
  group.add(helmet(0.6, 0.85));
  return group;
}

export function makeSunglasses() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) group.add(box(0.5, 0.3, 0.08, 0x111111, side * 0.32, 0, 0));
  group.add(box(1.2, 0.08, 0.08, 0x111111, 0, 0.14, 0));
  group.add(ball(0.06, 0xffffff, -0.42, 0.06, 0.06));
  group.add(ball(0.06, 0xffffff, 0.22, 0.06, 0.06));
  group.add(helmet(0.75, 0.05));
  for (const part of group.children) part.position.y += 0.5; // float at laser height
  return group;
}

// ---------- Grape Boss: grapes in a space helmet, with two big blasters and purple feet ----------

export function makeGrapeBoss() {
  const group = new THREE.Group();
  // A bunch of grapes: rows that get smaller toward the bottom
  const rows = [
    [3.2, 0.95, 7],
    [2.6, 0.8, 6],
    [2.0, 0.65, 5],
    [1.45, 0.45, 3],
  ];
  for (const [y, ring, count] of rows) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      group.add(ball(0.42, 0x7b1fa2, Math.cos(angle) * ring, y, Math.sin(angle) * ring));
    }
  }
  group.add(ball(0.6, 0x8e24aa, 0, 2.6, 0));
  // Angry face on the front
  for (const side of [-1, 1]) {
    group.add(ball(0.13, 0xffffff, side * 0.35, 2.9, 1.0));
    group.add(ball(0.07, 0x000000, side * 0.35, 2.9, 1.1));
    const brow = box(0.35, 0.07, 0.07, 0x000000, side * 0.35, 3.12, 1.05);
    brow.rotation.z = side * 0.4;
    group.add(brow);
  }
  // Stem, helmet, blasters and feet
  group.add(box(0.12, 0.4, 0.12, 0x5d4037, 0, 4.0, 0));
  group.add(ball(1.75, 0xbbefff, 0, 2.7, 0, { transparent: true, opacity: 0.22, roughness: 0.1 }));
  for (const side of [-1, 1]) {
    group.add(box(0.9, 0.35, 0.35, 0x37474f, side * 1.9, 2.2, 0.3));
    group.add(box(0.2, 0.2, 0.6, 0x263238, side * 1.9, 2.2, 0.7));
    group.add(ball(0.35, 0x7b1fa2, side * 0.5, 0.3, 0));
    group.add(box(0.06, 1.0, 0.06, 0x1a2a6c, side * 0.5, 0.9, 0));
  }
  return group;
}

// ---------- Things to collect and the world ----------

export function makeBolt() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x806000 }),
  );
  coin.rotation.x = Math.PI / 2;
  const group = new THREE.Group();
  group.add(coin);
  const bolt = new THREE.Mesh(boltShape(), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  bolt.scale.setScalar(1.2);
  bolt.position.z = 0.05;
  group.add(bolt);
  return group;
}

export function makeCrystal() {
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00838f, flatShading: true }),
  );
  crystal.scale.y = 1.6;
  return crystal;
}

export function makeKey() {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x806000 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.1, 8, 16), gold);
  ring.position.y = 0.5;
  group.add(ring);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), gold);
  shaft.position.y = -0.2;
  group.add(shaft);
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), gold);
  tooth.position.set(0.15, -0.55, 0);
  group.add(tooth);
  return group;
}

export function makeRocket() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3, 16), mat(0xeceff1));
  body.position.y = 1.8;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 16), mat(0xd32f2f));
  nose.position.y = 4;
  group.add(nose);
  for (let i = 0; i < 3; i++) {
    const fin = box(0.1, 1, 0.8, 0xd32f2f);
    const angle = (i / 3) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 0.85, 0.6, Math.sin(angle) * 0.85);
    fin.rotation.y = -angle;
    group.add(fin);
  }
  const window = ball(0.3, 0x81d4fa, 0, 2.4, 0.75);
  group.add(window);
  return group;
}

// A planet with craters. `seed` keeps the craters in the same places every time.
export function makePlanet(radius, color, seed) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), mat(color)));
  const crater = mat(new THREE.Color(color).multiplyScalar(0.7).getHex());
  for (let i = 0; i < Math.round(radius * 1.5); i++) {
    const a = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const b = Math.sin(seed * 39.3468 + i * 11.135) * 24634.6345;
    const theta = (a - Math.floor(a)) * Math.PI * 2;
    const phi = Math.acos(2 * (b - Math.floor(b)) - 1);
    const size = radius * (0.08 + ((a * 7) % 1 + 1) % 1 * 0.1);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), crater);
    spot.position.setFromSphericalCoords(radius - size * 0.55, phi, theta);
    group.add(spot);
  }
  return group;
}

// Yellow ring on a planet: jump from here to reach the next planet.
export function makeJumpRing() {
  return new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.1, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
}

export function makeForceField(radius) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.18, wireframe: false, depthWrite: false, side: THREE.DoubleSide }),
  );
}

export function makeStars() {
  const positions = [];
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(400 + Math.random() * 200);
    positions.push(v.x, v.y, v.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false }));
}

// Mecha Capybara: a giant robot suit (faces +Z like the heroes).
export function makeMecha() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(box(0.45, 0.9, 0.45, 0x455a64, side * 0.5, 0.45, 0)); // legs
    group.add(box(0.3, 0.9, 0.3, 0x607d8b, side * 0.95, 1.4, 0.2)); // arms
  }
  group.add(box(1.5, 1.1, 1.3, 0x90a4ae, 0, 1.45, 0)); // body
  group.add(box(1.5, 0.15, 1.32, 0xffd23f, 0, 1.35, 0)); // stripe
  group.add(box(0.9, 0.7, 0.8, 0x607d8b, 0, 2.35, 0.3)); // head
  group.add(box(0.7, 0.18, 0.1, 0xff1744, 0, 2.4, 0.72)); // red visor
  group.add(box(0.5, 0.5, 0.9, 0x37474f, 0, 2.0, -0.8)); // rocket launcher on the back
  return group;
}

// ---------- Aliens (Ethan's design: little green aliens with big eyes and ray guns, riding flying saucers) ----------

function makeAlienBody(group, y = 0) {
  const green = 0x76ff03;
  group.add(box(0.5, 0.55, 0.35, green, 0, y + 0.55, 0));
  group.add(ball(0.38, green, 0, y + 1.15, 0));
  for (const side of [-1, 1]) {
    const eye = ball(0.13, 0x000000, side * 0.15, y + 1.18, 0.3);
    eye.scale.set(1, 1.4, 0.6); // big black alien eyes
    group.add(eye);
    group.add(box(0.04, 0.35, 0.04, green, side * 0.15, y + 1.6, 0)); // antennas
    group.add(ball(0.07, 0xff4081, side * 0.15, y + 1.8, 0));
  }
}

// A little green alien with a ray gun (walks on the ground after its saucer is knocked down).
export function makeAlien() {
  const group = new THREE.Group();
  makeAlienBody(group);
  for (const side of [-1, 1]) group.add(box(0.15, 0.3, 0.15, 0x64dd17, side * 0.13, 0.15, 0));
  group.add(box(0.12, 0.12, 0.45, 0x607d8b, 0.32, 0.6, 0.25)); // ray gun
  group.add(box(0.08, 0.08, 0.08, 0x00e5ff, 0.32, 0.6, 0.5));
  return group;
}

// A flying saucer with an alien inside the glass dome. Returns { group, lights } (the lights blink).
export function makeSaucer() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 0.35, 24), mat(0xb0bec5, { metalness: 0.4 }));
  group.add(disc);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 0.3, 20), mat(0x78909c));
  bottom.position.y = -0.3;
  group.add(bottom);
  const alien = new THREE.Group();
  makeAlienBody(alien, -0.45);
  alien.scale.setScalar(0.7);
  group.add(alien);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x80deea, transparent: true, opacity: 0.35 }),
  );
  dome.position.y = 0.15;
  group.add(dome);
  const lights = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const light = ball(0.1, 0xffeb3b, Math.cos(angle) * 1.4, 0, Math.sin(angle) * 1.4, { emissive: 0x000000 });
    light.material = light.material.clone();
    group.add(light);
    lights.push(light);
  }
  return { group, lights };
}

// The tractor beam: a see-through cone, pointing down from the saucer (height 1, scaled to the right length).
export function makeTractorBeam() {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 1.3, 1, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xb2ff59, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.geometry.translate(0, -0.5, 0); // the top is at y = 0
  return beam;
}

// Inside the alien spaceship: a big metal room all around its little floor planet, with glowing stripes.
export function makeShipRoom(radius) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), new THREE.MeshStandardMaterial({ color: 0x37474f, side: THREE.BackSide, flatShading: true })));
  for (let i = -2; i <= 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * Math.cos(i * 0.45) - 0.1, 0.12, 6, 48), new THREE.MeshBasicMaterial({ color: 0x76ff03 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = radius * Math.sin(i * 0.45);
    group.add(ring);
  }
  group.add(new THREE.PointLight(0xb2ff59, 60, radius * 3));
  return group;
}

// The big red button that drops you back down from the spaceship.
export function makeRedButton() {
  const group = new THREE.Group();
  group.add(box(1.4, 0.3, 1.4, 0x424242, 0, 0.15, 0));
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20), mat(0xff1744, { emissive: 0x550000 }));
  button.position.y = 0.45;
  group.add(button);
  return group;
}
