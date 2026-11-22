import * as THREE from 'three';
import { makeHero, heroLook, HEAD_3D } from '../world2/models.js';

// CAPY CIRCUIT's 3D models, built from simple shapes like World 2's (facing +Z, +Y up, standing on y = 0).

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

function ball(radius, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

export const ROBOT_COLOR = 0x55556a;
const RED_EYE = new THREE.MeshBasicMaterial({ color: 0xff1744 });

// The story's evil robot copies (StoryLevelScene's createCopy): the hero in dark metal, with glowing red eyes.
export function makeRobotCopy(heroId) {
  const hero = makeHero(heroId).group;
  const grey = new THREE.Color(ROBOT_COLOR);
  hero.traverse((part) => {
    if (!part.isMesh || !part.material.color) return;
    part.material = new THREE.MeshStandardMaterial({ color: part.material.color.clone().lerp(grey, 0.7), metalness: 0.6, roughness: 0.4, flatShading: true });
  });
  const eyes = HEAD_3D[heroLook(heroId).animal]?.eyes ?? [0, 1, 0.9];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), RED_EYE);
    eye.position.set(eyes[0] + side * 0.16, eyes[1], eyes[2] + 0.02);
    hero.add(eye);
  }
  return hero;
}

// A race car with a driver in it. Returns the car and its wheels (they spin as it drives).
export function makeCar(color, stripe, driver) {
  const group = new THREE.Group();
  group.add(box(1.9, 0.55, 3.6, color, 0, 0.6, 0)); // body
  group.add(box(1.5, 0.35, 1.2, color, 0, 0.55, 2.2)); // nose
  group.add(box(0.4, 0.57, 4.6, stripe, 0, 0.61, 0.3)); // racing stripe
  group.add(box(2.4, 0.12, 0.6, stripe, 0, 0.5, 2.75)); // front wing
  // Spoiler on two posts
  group.add(box(0.1, 0.55, 0.1, 0x222222, -0.6, 1.05, -1.55));
  group.add(box(0.1, 0.55, 0.1, 0x222222, 0.6, 1.05, -1.55));
  group.add(box(2.1, 0.12, 0.6, stripe, 0, 1.35, -1.6));
  const wheels = [];
  for (const [x, z] of [[-1.1, 1.3], [1.1, 1.3], [-1.1, -1.25], [1.1, -1.25]]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.45, 12), mat(0x1b1b1b));
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    const hub = box(0.47, 0.22, 0.22, 0xbdbdbd); // shows the wheel turning
    wheel.add(hub);
    wheel.position.set(x, 0.48, z);
    wheels.push(wheel);
    group.add(wheel);
  }
  if (driver) {
    driver.scale.setScalar(0.85);
    driver.position.set(0, 0.62, -0.45);
    group.add(driver);
  }
  return { group, wheels };
}

// Baby Capybara (a boy), standing on y = 0. armsUp: holding something up (the start's traffic light).
export function makeBabyCapybara(armsUp = false) {
  const baby = new THREE.Group();
  baby.add(box(0.9, 0.7, 1.1, 0xb07a48, 0, 0.35, 0)); // body
  baby.add(box(0.75, 0.65, 0.7, 0xb07a48, 0, 0.95, 0.35)); // head
  baby.add(box(0.5, 0.35, 0.3, 0x7a5232, 0, 0.85, 0.75)); // snout
  baby.add(ball(0.08, 0x000000, -0.2, 1.1, 0.71));
  baby.add(ball(0.08, 0x000000, 0.2, 1.1, 0.71));
  baby.add(box(0.15, 0.15, 0.1, 0x7a5232, -0.25, 1.33, 0.25)); // ears
  baby.add(box(0.15, 0.15, 0.1, 0x7a5232, 0.25, 1.33, 0.25));
  baby.add(ball(0.1, 0xff80ab, 0, 0.78, 0.92)); // pacifier
  if (armsUp) {
    // Both arms up, holding the light
    baby.add(box(0.18, 1.0, 0.18, 0xb07a48, -0.4, 1.35, 0.2));
    baby.add(box(0.18, 1.0, 0.18, 0xb07a48, 0.4, 1.35, 0.2));
  }
  return baby;
}

// Baby Capybara holding the start's traffic light (Ethan's idea): red, red, red... GREEN! GO!
// Returns the group and setLights(count, green).
export function makeStartLight() {
  const group = new THREE.Group();
  // Baby Capybara on a little cloud
  const cloud = new THREE.Group();
  for (const [x, y, r] of [[0, 0, 1.3], [-1.2, -0.1, 1], [1.2, -0.1, 1], [0.6, 0.5, 0.8], [-0.6, 0.5, 0.8]]) cloud.add(ball(r, 0xffffff, x, y, 0));
  group.add(cloud);
  const baby = makeBabyCapybara(true);
  baby.position.y = 0.9;
  group.add(baby);
  // The traffic light
  const light = new THREE.Group();
  light.add(box(1.1, 3.0, 0.7, 0x212121));
  const lamps = [];
  for (let i = 0; i < 3; i++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshBasicMaterial({ color: 0x3a3a3a }));
    lamp.position.set(0, 0.95 - i * 0.95, 0.38);
    lamps.push(lamp);
    light.add(lamp);
  }
  light.position.set(0, 3.9, 0.2);
  group.add(light);
  const setLights = (count, green = false) => {
    lamps.forEach((lamp, i) => lamp.material.color.setHex(green ? 0x00e676 : i < count ? 0xff1744 : 0x3a3a3a));
  };
  return { group, baby, setLights };
}

// The winners' podium: 1st in the middle (highest), 2nd on the left, 3rd on the right.
// Returns the group and the top of each step (index 0 = 1st place).
export function makePodium() {
  const group = new THREE.Group();
  const steps = [
    { x: 0, h: 3, color: 0xffd23f },
    { x: -3.2, h: 2, color: 0xcfd8dc },
    { x: 3.2, h: 1.3, color: 0xcd7f32 },
  ];
  const tops = steps.map(({ x, h, color }, i) => {
    group.add(box(3, h, 3, color, x, h / 2, 0));
    group.add(numberSign(i + 1, x, h / 2, 1.52));
    return new THREE.Vector3(x, h, 0);
  });
  return { group, tops };
}

function numberSign(n, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 32, 36);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sign.position.set(x, y, z);
  return sign;
}

// A canvas texture: chevrons for the boost pads, or the checkered start/finish line.
export function makeTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (kind === 'checker') {
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#111111' : '#ffffff';
      ctx.fillRect(x * 8, y * 8, 8, 8);
    }
  } else {
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffea00';
    for (const y of [6, 34]) {
      ctx.beginPath();
      ctx.moveTo(8, y + 22);
      ctx.lineTo(32, y);
      ctx.lineTo(56, y + 22);
      ctx.lineTo(46, y + 22);
      ctx.lineTo(32, y + 10);
      ctx.lineTo(18, y + 22);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  return texture;
}
