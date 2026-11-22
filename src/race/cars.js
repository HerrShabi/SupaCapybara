import * as THREE from 'three';
import { heroLook } from '../world2/models.js';

// CAPY CIRCUIT's garage parts (Ethan, 2026-11-22, concept-art/garage.jpg): the car you build from a body, a color,
// wheels and a spoiler. Bodies, colors and wheels are free; spoilers are bought once (price) and do something:
// rocket = a quick boost (C), wing = longer jumps, shield = bumps bounce off you.
// Animal bodies are the animal's whole body, head in front and tail at the back, but no legs (Ethan).
// buildCar() makes the 3D car (facing +Z, standing on y = 0) with the driver in it.

export const BODIES = [
  { id: 'race', icon: '🏎️' },
  { id: 'monster', icon: '🛻' },
  { id: 'jeep', icon: '🚙' },
  { id: 'police', icon: '🚓' },
  { id: 'kart', icon: '🏁' },
  { id: 'capybara', icon: '🦫' },
  { id: 'shark', icon: '🦈' },
  { id: 'dragon', icon: '🐉' },
  { id: 'cat', icon: '🐱' },
];

// 'hero' = your hero's suit color
export const COLORS = [
  { id: 'hero', color: null },
  { id: 'red', color: 0xe53935 },
  { id: 'blue', color: 0x1e88e5 },
  { id: 'green', color: 0x43a047 },
  { id: 'yellow', color: 0xfdd835 },
  { id: 'pink', color: 0xf06292 },
  { id: 'purple', color: 0x8e24aa },
  { id: 'orange', color: 0xfb8c00 },
  { id: 'black', color: 0x212121 },
  { id: 'white', color: 0xf5f5f5 },
];

export const WHEELS = [
  { id: 'normal', icon: '⚫', radius: 0.48 },
  { id: 'monster', icon: '🛞', radius: 0.82 },
  { id: 'kart', icon: '🔘', radius: 0.32 },
  { id: 'flame', icon: '🔥', radius: 0.48 },
  { id: 'neon', icon: '💡', radius: 0.48 },
  { id: 'spiky', icon: '⚡', radius: 0.5 },
];

export const SPOILERS = [
  { id: 'none', icon: '➖', price: 0 },
  { id: 'rocket', icon: '🚀', price: 300 },
  { id: 'wing', icon: '🪽', price: 300 },
  { id: 'shield', icon: '🛡️', price: 400 },
];

export const PARTS = { body: BODIES, color: COLORS, wheels: WHEELS, spoiler: SPOILERS };
export const DEFAULT_CAR = { body: 'race', color: 'hero', wheels: 'normal', spoiler: 'none' };

// The car saved in the garage (old or broken saves get the default parts).
export function savedCar(save) {
  const car = { ...DEFAULT_CAR, ...save.raceCar };
  for (const [part, list] of Object.entries(PARTS)) if (!list.some((x) => x.id === car[part])) car[part] = DEFAULT_CAR[part];
  if (!ownsSpoiler(save, car.spoiler)) car.spoiler = 'none';
  return car;
}

export function ownsSpoiler(save, id) {
  return id === 'none' || Boolean(save.raceSpoilers?.includes(id));
}

const materials = new Map();
function mat(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, ...options }));
  return materials.get(key);
}
const glow = (color) => new THREE.MeshBasicMaterial({ color });

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  return mesh;
}

function ball(r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

function cone(r, h, color, x, y, z, rx = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, 0, rz);
  return mesh;
}

const darker = (color, k = 0.6) => new THREE.Color(color).multiplyScalar(k).getHex();

// ---------- Bodies (made for 0.48 wheels; bigger wheels lift them) ----------
// Each returns { group, seat: [y, z] (where the driver sits), wheelX, spoiler: [y, z] }

const BODY_BUILDERS = {
  race(c, s) {
    const g = new THREE.Group();
    g.add(box(1.9, 0.55, 3.6, c, 0, 0.6, 0));
    g.add(box(1.5, 0.35, 1.2, c, 0, 0.55, 2.2)); // nose
    g.add(box(0.4, 0.57, 4.6, s, 0, 0.61, 0.3)); // stripe
    g.add(box(2.4, 0.12, 0.6, s, 0, 0.5, 2.75)); // front wing
    return { group: g, seat: [0.62, -0.45], wheelX: 1.1, spoiler: [0.85, -1.6] };
  },
  monster(c, s) {
    const g = new THREE.Group();
    g.add(box(2.1, 0.7, 3.8, c, 0, 1.25, 0)); // body, up high
    g.add(box(1.9, 0.5, 1.0, c, 0, 1.85, 0.75)); // hood bump in front of the driver
    g.add(box(1.7, 0.55, 0.12, 0x90caf9, 0, 2.3, 0.3)); // windshield
    g.add(box(2.2, 0.25, 0.3, 0x9e9e9e, 0, 1.0, 1.95)); // bumper
    g.add(box(0.5, 0.72, 3.82, s, 0, 1.26, 0)); // stripe
    for (const x of [-0.7, 0.7]) g.add(box(0.15, 0.6, 0.15, 0x424242, x, 0.75, 0)); // suspension
    return { group: g, seat: [1.6, -0.5], wheelX: 1.25, spoiler: [1.55, -1.8] };
  },
  jeep(c, s) {
    const g = new THREE.Group();
    g.add(box(2.0, 0.8, 3.6, c, 0, 0.8, 0));
    g.add(box(1.9, 0.25, 1.3, darker(c), 0, 1.3, 1.1)); // hood
    for (const z of [-0.2, -1.5]) g.add(box(2.0, 0.12, 0.12, 0x424242, 0, 2.05, z)); // roll bar
    for (const x of [-0.95, 0.95]) for (const z of [-0.2, -1.5]) g.add(box(0.12, 0.9, 0.12, 0x424242, x, 1.6, z));
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mat(0x1b1b1b));
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, 0.95, -1.95);
    g.add(spare);
    g.add(box(2.02, 0.15, 3.62, s, 0, 0.95, 0)); // stripe
    return { group: g, seat: [0.9, -0.7], wheelX: 1.15, spoiler: [1.15, -1.7] };
  },
  police(c, s) {
    const g = new THREE.Group();
    g.add(box(1.9, 0.6, 3.9, c, 0, 0.7, 0));
    g.add(box(1.7, 0.5, 0.12, 0x263238, 0, 1.25, 0.45)); // windshield (no roof, so you can see the driver)
    g.add(box(1.7, 0.08, 0.3, 0xffffff, 0, 1.54, 0.45)); // light bar
    g.add(box(1.92, 0.2, 1.0, 0xffffff, 0, 0.75, 0.2)); // door stripe
    const red = box(0.5, 0.18, 0.3, glow(0xff1744), -0.3, 1.66, 0.45);
    const blue = box(0.5, 0.18, 0.3, glow(0x2979ff), 0.3, 1.66, 0.45);
    g.add(red, blue);
    g.userData.siren = [red, blue]; // they blink (RaceWorld / the garage)
    return { group: g, seat: [0.75, -0.45], wheelX: 1.1, spoiler: [1.0, -1.75] };
  },
  kart(c, s) {
    const g = new THREE.Group();
    g.add(box(1.7, 0.18, 2.8, 0x424242, 0, 0.35, 0)); // frame
    g.add(box(1.5, 0.3, 0.5, c, 0, 0.5, 1.45)); // front bumper
    g.add(box(1.0, 0.5, 0.8, c, 0, 0.6, 0.9)); // nose
    g.add(box(1.9, 0.25, 0.4, s, 0, 0.45, -1.4)); // back bumper
    g.add(box(0.9, 0.7, 0.2, c, 0, 0.75, -0.9)); // seat back
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12), mat(0x111111));
    wheel.position.set(0, 0.95, 0.35);
    wheel.rotation.x = -0.8;
    g.add(wheel);
    return { group: g, seat: [0.4, -0.35], wheelX: 0.95, spoiler: [0.6, -1.4] };
  },

  // Animal cars: the whole animal, lying down, no legs
  capybara(c) {
    const g = new THREE.Group();
    const dark = darker(c, 0.55);
    g.add(ball(1, c, 0, 0.95, -0.1, 1.0, 0.6, 2.0)); // body
    g.add(box(1.1, 0.9, 1.0, c, 0, 1.15, 1.95)); // head
    g.add(box(0.8, 0.55, 0.45, dark, 0, 1.0, 2.6)); // snout
    for (const x of [-0.3, 0.3]) {
      g.add(ball(0.1, 0x000000, x, 1.4, 2.47));
      g.add(box(0.2, 0.2, 0.12, dark, x * 1.3, 1.68, 1.75)); // ears
    }
    return { group: g, seat: [1.25, -0.6], wheelX: 1.1, spoiler: [1.4, -1.9] };
  },
  shark(c) {
    const g = new THREE.Group();
    g.add(ball(1, c, 0, 0.95, 0, 1.0, 0.65, 2.3)); // body
    g.add(ball(0.9, 0xffffff, 0, 0.75, 0.3, 0.85, 0.4, 1.9)); // white belly
    g.add(cone(0.6, 1.1, c, 0, 0.95, 2.6, Math.PI / 2)); // pointy nose
    g.add(cone(0.35, 1.0, c, 0, 1.85, -0.3, -0.3)); // fin on top
    g.add(cone(0.35, 1.2, c, 0, 1.5, -2.5, -0.9)); // tail fin up
    g.add(cone(0.3, 0.9, c, 0, 0.6, -2.4, -2.3)); // tail fin down
    for (const x of [-0.55, 0.55]) g.add(ball(0.12, 0x000000, x, 1.15, 1.9));
    for (let i = 0; i < 5; i++) g.add(cone(0.07, 0.18, 0xffffff, -0.32 + i * 0.16, 0.62, 2.35, Math.PI)); // teeth
    return { group: g, seat: [1.3, 0.4], wheelX: 1.1, spoiler: [1.4, -1.6] };
  },
  dragon(c) {
    const g = new THREE.Group();
    const dark = darker(c, 0.55);
    g.add(ball(1, c, 0, 0.95, -0.1, 1.0, 0.6, 2.0)); // body
    g.add(box(0.9, 0.75, 1.3, c, 0, 1.3, 2.1)); // head
    g.add(box(0.7, 0.4, 0.6, c, 0, 1.15, 2.9)); // snout
    for (const x of [-0.25, 0.25]) {
      g.add(cone(0.12, 0.6, 0xfff3e0, x, 1.9, 1.8, -0.5)); // horns
      g.add(ball(0.09, 0xffeb3b, x * 1.5, 1.5, 2.75)); // yellow eyes
    }
    for (let i = 0; i < 5; i++) g.add(cone(0.15, 0.4, dark, 0, 1.6 - i * 0.05, 1.0 - i * 0.65)); // back spikes
    for (const side of [-1, 1]) {
      const wing = cone(0.6, 1.6, dark, side * 1.3, 1.4, -0.2, 0, side * 1.2); // little wings
      wing.scale.z = 0.2;
      g.add(wing);
    }
    g.add(cone(0.35, 1.4, c, 0, 0.9, -2.6, -Math.PI / 2)); // tail
    return { group: g, seat: [1.25, -0.4], wheelX: 1.1, spoiler: [1.4, -1.9] };
  },
  cat(c) {
    const g = new THREE.Group();
    g.add(ball(1, c, 0, 0.9, -0.1, 0.95, 0.55, 2.0)); // body
    g.add(ball(0.7, c, 0, 1.35, 2.0)); // head
    for (const x of [-0.35, 0.35]) {
      g.add(cone(0.22, 0.45, c, x, 2.05, 1.95)); // ears
      g.add(ball(0.1, 0x000000, x * 0.75, 1.5, 2.62));
    }
    g.add(ball(0.08, 0xff6f9c, 0, 1.3, 2.7)); // nose
    for (const side of [-1, 1]) for (const y of [1.25, 1.35]) g.add(box(0.7, 0.03, 0.03, 0x111111, side * 0.6, y, 2.5)); // whiskers
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.7), mat(c));
    tail.position.set(0, 1.4, -2.3);
    tail.rotation.x = -0.5;
    g.add(tail);
    return { group: g, seat: [1.15, -0.5], wheelX: 1.05, spoiler: [1.3, -1.8] };
  },
};

// ---------- Wheels ----------

function makeWheel(type) {
  const { radius } = WHEELS.find((w) => w.id === type) ?? WHEELS[0];
  const wheel = new THREE.Group();
  const width = type === 'monster' ? 0.7 : type === 'kart' ? 0.3 : 0.45;
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 14), mat(0x1b1b1b));
  tire.rotation.z = Math.PI / 2;
  wheel.add(tire);
  const hubColor = type === 'flame' ? 0xff6d00 : type === 'spiky' ? 0xffd23f : 0xbdbdbd;
  wheel.add(box(width + 0.02, radius * 0.45, radius * 0.45, hubColor)); // shows the wheel turning
  if (type === 'monster') for (let i = 0; i < 10; i++) {
    const tread = box(width + 0.04, 0.12, 0.25, 0x111111);
    const a = (i / 10) * Math.PI * 2;
    tread.position.set(0, Math.sin(a) * radius, Math.cos(a) * radius);
    tread.rotation.x = -a;
    wheel.add(tread);
  }
  if (type === 'flame') for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const flame = cone(0.12, 0.35, glow(i % 2 ? 0xff9100 : 0xffea00), 0, Math.sin(a) * (radius + 0.1), Math.cos(a) * (radius + 0.1));
    flame.rotation.x = a - Math.PI / 2;
    wheel.add(flame);
  }
  if (type === 'neon') {
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.75, 0.06, 8, 20), glow(0x00e5ff));
      ring.rotation.y = Math.PI / 2;
      ring.position.x = side * (width / 2 + 0.02);
      wheel.add(ring);
    }
  }
  if (type === 'spiky') for (const side of [-1, 1]) {
    const spike = cone(0.12, 0.45, 0xffd23f, side * (width / 2 + 0.2), 0, 0, 0, -side * Math.PI / 2);
    wheel.add(spike);
  }
  return { wheel, radius };
}

// ---------- Spoilers ----------

function makeSpoiler(type, stripe) {
  const g = new THREE.Group();
  if (type === 'none') return g;
  for (const x of [-0.6, 0.6]) g.add(box(0.1, 0.5, 0.1, 0x222222, x, 0.25, 0));
  if (type === 'rocket') {
    g.add(box(1.9, 0.1, 0.5, stripe, 0, 0.5, 0));
    for (const x of [-0.45, 0.45]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 10), mat(0xb0bec5, { metalness: 0.5 }));
      tube.rotation.x = Math.PI / 2;
      tube.position.set(x, 0.75, -0.1);
      g.add(tube);
      g.add(cone(0.2, 0.4, 0xd32f2f, x, 0.75, 0.55, Math.PI / 2)); // red tip
      g.add(ball(0.14, glow(0xff9100), x, 0.75, -0.65)); // glowing back
    }
  } else if (type === 'wing') {
    const wing = box(2.8, 0.1, 0.8, stripe, 0, 0.6, 0);
    wing.rotation.x = -0.15;
    g.add(wing);
    for (const x of [-1.4, 1.4]) g.add(box(0.08, 0.5, 0.9, 0x222222, x, 0.6, 0)); // end plates
  } else if (type === 'shield') {
    g.add(box(2.0, 0.1, 0.55, stripe, 0, 0.5, 0));
    g.add(ball(0.25, glow(0x40c4ff), 0, 0.8, 0)); // shield orb
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), glow(0x80d8ff));
    ring.position.y = 0.8;
    g.add(ring);
  }
  return g;
}

// ---------- The whole car ----------

// config: { body, color, wheels, spoiler }; heroId picks the 'hero' color. Returns { group, wheels, bubble }.
// bubble: the shield spoiler's bubble (hidden until a bump).
export function buildCar(config, heroId, driver) {
  const look = heroLook(heroId);
  const pick = COLORS.find((c) => c.id === config.color)?.color;
  const color = pick ?? look.suit ?? look.cape ?? 0xd8343f;
  const stripe = config.color === 'hero' ? look.cape ?? 0xffd23f : color === 0xfdd835 ? 0x212121 : 0xffd23f;
  const body = (BODY_BUILDERS[config.body] ?? BODY_BUILDERS.race)(color, stripe);
  const group = new THREE.Group();
  const { radius } = WHEELS.find((w) => w.id === config.wheels) ?? WHEELS[0];
  const lift = radius - 0.48; // bigger wheels lift the car
  body.group.position.y = lift;
  group.add(body.group);
  group.userData.siren = body.group.userData.siren;

  const wheels = [];
  const wheelX = body.wheelX + (config.wheels === 'monster' ? 0.15 : 0);
  for (const [x, z] of [[-wheelX, 1.3], [wheelX, 1.3], [-wheelX, -1.25], [wheelX, -1.25]]) {
    const { wheel } = makeWheel(config.wheels);
    wheel.position.set(x, radius, z);
    wheels.push(wheel);
    group.add(wheel);
  }

  const spoiler = makeSpoiler(config.spoiler, stripe);
  spoiler.position.set(0, body.spoiler[0] + lift, body.spoiler[1]);
  group.add(spoiler);

  if (driver) {
    driver.scale.setScalar(0.85);
    driver.position.set(0, body.seat[0] + lift, body.seat[1]);
    group.add(driver);
  }

  const bubble = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x40c4ff, transparent: true, opacity: 0.25, depthWrite: false }));
  bubble.position.y = 1 + lift;
  bubble.scale.z = 1.2;
  bubble.visible = false;
  group.add(bubble);
  return { group, wheels, bubble };
}
