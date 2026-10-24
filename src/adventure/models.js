import * as THREE from 'three';
import { makeHero, makeGrapeBoss } from '../world2/models.js';

// 3D models for ADVENTURE (built from simple shapes, like World 2's).

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, ...options });
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

// Treasure chest. Returns { group, lid } so the lid can open. `chains` shows it's still guarded.
export function makeChest() {
  const group = new THREE.Group();
  group.add(box(1.4, 0.8, 0.9, 0x8d5524, 0, 0.4, 0));
  group.add(box(1.45, 0.12, 0.95, 0xffc107, 0, 0.55, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.8, -0.45);
  const lidBox = box(1.4, 0.35, 0.9, 0x9c6430, 0, 0.17, 0.45);
  lid.add(lidBox);
  lid.add(box(0.2, 0.2, 0.06, 0xffc107, 0, 0.05, 0.92)); // lock
  group.add(lid);
  const chains = new THREE.Group();
  for (const angle of [0.6, -0.6]) {
    const chain = box(1.9, 0.08, 0.08, 0x9e9e9e, 0, 0.55, 0.48);
    chain.rotation.z = angle;
    chains.add(chain);
  }
  group.add(chains);
  return { group, lid, chains };
}

export function makeTree(seed) {
  const group = new THREE.Group();
  const height = 3 + (seed % 3);
  group.add(box(0.5, height, 0.5, 0x6d4c41, 0, height / 2, 0));
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(2, height, 7), mat(seed % 2 ? 0x2e7d32 : 0x388e3c));
  leaves.position.y = height + height / 2 - 0.5;
  group.add(leaves);
  return group;
}

const BUILDING_COLORS = [0x8d6e63, 0x78909c, 0xa1887f, 0x607d8b, 0x9e7f6e, 0x7986cb];

// A city building with rows of windows.
export function makeBuilding(width, depth, height, index) {
  const group = new THREE.Group();
  group.add(box(width, height, depth, BUILDING_COLORS[index % BUILDING_COLORS.length], 0, height / 2, 0));
  group.add(box(width + 0.3, 0.3, depth + 0.3, 0x455a64, 0, height, 0)); // roof ledge
  const glass = mat(0xffe082, { emissive: 0x6b5300 });
  for (let y = 1; y < height - 0.5; y += 1.6) {
    for (let x = -width / 2 + 1.2; x < width / 2 - 0.8; x += 2) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), glass);
      window.position.set(x, y, depth / 2 + 0.02);
      group.add(window);
    }
  }
  return group;
}

// The secret door, with 6 slots that light up as you find puzzle pieces.
export function makeDoor() {
  const group = new THREE.Group();
  group.add(box(1.2, 8, 1.6, 0x616161, -3.4, 4, 0));
  group.add(box(1.2, 8, 1.6, 0x616161, 3.4, 4, 0));
  group.add(box(8, 1.4, 1.6, 0x616161, 0, 8.4, 0));
  const door = box(5.6, 7.6, 0.6, 0x4e342e, 0, 3.8, 0);
  group.add(door);
  const slots = [];
  for (let i = 0; i < 6; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), mat(0x263238, { emissive: 0x000000 }));
    slot.position.set(-1.9 + (i % 3) * 1.9, 5.4 - Math.floor(i / 3) * 1.4, 0.36);
    group.add(slot);
    slots.push(slot);
  }
  return { group, door, slots };
}

// Evil Capybara: SuperCapybara's dark twin, with a black cape and glowing red eyes.
export function makeEvilCapybara() {
  const { group, legs, cape } = makeHero('supa-capybara', 0, null, { suit: 0x212121, suitDark: 0x000000, cape: 0x1a1a1a });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    eye.position.set(side * 0.2, 0.98, 0.95);
    group.add(eye);
  }
  group.scale.setScalar(1.6);
  return { group, legs, cape };
}

// A big 3D pizza slice (tip down), like Pizza Boss.
function makePizzaSlice() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.6, 1.4);
  shape.lineTo(1.6, 1.4);
  shape.lineTo(0, -1.8);
  shape.closePath();
  const slice = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }), mat(0xffc84a));
  slice.position.z = -0.25;
  const group = new THREE.Group();
  group.add(slice);
  group.add(box(3.4, 0.5, 0.7, 0xc77a2a, 0, 1.5, 0)); // crust
  for (const [x, y] of [[-0.7, 0.6], [0.6, 0.4], [0, -0.5]]) {
    const pepperoni = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), mat(0xc0392b));
    pepperoni.rotation.x = Math.PI / 2;
    pepperoni.position.set(x, y, 0.3);
    group.add(pepperoni);
  }
  return group;
}

// The MEGA MONSTER: Pizza Boss + Grape Boss + the Lava Dragon melted together (Evil Capybara's part 2).
export function makeMegaMonster() {
  const group = new THREE.Group();
  // Pizza body on spiky metal legs
  const body = makePizzaSlice();
  body.position.y = 4.2;
  group.add(body);
  for (const side of [-1, 1]) {
    group.add(box(0.3, 2.4, 0.3, 0x1a2a6c, side * 0.6, 1.4, 0));
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), mat(0x9aa0aa));
    spike.rotation.x = Math.PI;
    spike.position.set(side * 0.6, 0.3, 0);
    group.add(spike);
    // Grape bunches for shoulders, with blasters
    const grapes = makeGrapeBoss();
    grapes.scale.setScalar(0.45);
    grapes.position.set(side * 2.4, 4.2, 0);
    group.add(grapes);
    // Dragon wings
    const wing = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 3), mat(0x7f1d0d));
    wing.rotation.z = side * -1.1;
    wing.position.set(side * 2.2, 6.6, -0.8);
    group.add(wing);
  }
  // Lava Dragon head on top, with horns and glowing eyes
  const head = new THREE.Group();
  head.position.set(0, 6.6, 0.3);
  head.add(box(1.6, 1.1, 1.8, 0x5d1a0e, 0, 0, 0));
  head.add(box(1.3, 0.5, 1.2, 0x4a140a, 0, -0.45, 0.8)); // jaw
  head.add(box(1.1, 0.12, 0.2, 0xffd54f, 0, -0.18, 1.45)); // fire in the mouth
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 5), mat(0x9e9e9e));
    horn.position.set(side * 0.55, 0.9, -0.3);
    horn.rotation.x = -0.4;
    head.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
    eye.position.set(side * 0.45, 0.25, 0.92);
    head.add(eye);
  }
  group.add(head);
  return group;
}

// A pile of rocks to stand on, or a cave tunnel's walls.
export function makeRock(width, height, depth, color = 0x6d6d6d) {
  return box(width, height, depth, color, 0, height / 2, 0);
}
