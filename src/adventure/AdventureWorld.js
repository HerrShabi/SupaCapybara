import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { getCharacter } from '../characters.js';
import { getDifficulty, BAD_GUY_REWARD, BOSS_REWARD } from '../difficulty.js';
import { writeSave } from '../save.js';
import { Hud } from '../world2/hud.js';
import * as heroModels from '../world2/models.js';
import * as models from './models.js';
import {
  MAP_SIZE,
  SPAWN,
  CITY,
  SPACE,
  VOLCANO,
  ARENA,
  DOOR,
  BUILDINGS,
  FLOATING_ROCKS,
  LAVA_RIVERS,
  CAVES,
  CHESTS,
  PIECES_NEEDED,
  CHEST_BOLTS,
} from './map.js';

// ADVENTURE: a big 3D world to explore (see map.js for the layout). Unlike World 2's little planets,
// "up" is always up here: the ground is a height map, and buildings, rocks and caves are boxes you can stand on.
//
// QuestWorld (src/quest/) extends this class to reuse the hero (moving, attacks, powers, getting hurt, camera).
// A world like that overrides: build(), begin(), spawn, groundAt(), zoneAt(), zoneName(), keepInside(), onLava(),
// updateWorld(dt), targets(), createHud() and respawn().

const UP = new THREE.Vector3(0, 1, 0);
const GRAVITY = 22;
const SPACE_GRAVITY = 9; // moon jumps in the space area
const JUMP_SPEED = 10.5; // about 2.5 high: enough to climb the city's building steps
const SPACE_JUMP_SPEED = 11;
const RUN_SPEED = 7;
const SHADOW_SPEED = 1.6;
const TURN_SPEED = 2.6;
const FLY_SPEED = 8;
const RADIUS = 0.5; // how wide the hero is
const HEIGHT = 1.2;

const ATTACK_COOLDOWN_MS = { laser: 250, superLaser: 220, goldLaser: 220, scratch: 300, tongue: 450, moon: 400, rocket: 300 };
const SHOT_SPEED = 28;
const SHOT_LIFE = 0.9;
const SCRATCH_REACH = 2.4;
const TONGUE_REACH = 6;
const POWER_MS = { invisible: 10000, shadow: 5000, shield: 10000, fly: 10000, mecha: 15000 };
// (The Freeze Ray has its own timers: see useFreezeRay.)
const POWER_WAIT_MS = 30000;

const GUARD_SEE = 14;
const BOSS_HIT_RADIUS = { evil: 1.8, giant: 4 };
const WAVE_SPEED = 9;

const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function orient(object, forward) {
  object.rotation.set(0, Math.atan2(forward.x, forward.z), 0);
}

// ---------- The land ----------

function cityMask(x, z) {
  const dx = Math.max(0, Math.abs(x - CITY.x) - CITY.halfWidth);
  const dz = Math.max(0, Math.abs(z - CITY.z) - CITY.halfDepth);
  return Math.max(0, 1 - Math.hypot(dx, dz) / 10);
}

export function zoneAt(x, z) {
  if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.radius + 10) return 'arena';
  if (cityMask(x, z) >= 1) return 'city';
  if (Math.hypot(x - SPACE.x, z - SPACE.z) < SPACE.radius) return 'space';
  if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.radius) return 'volcano';
  return 'grass';
}

export function groundHeight(x, z) {
  if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.radius + 10) return 0;
  let h = 1.6 * Math.sin(x * 0.06) * Math.cos(z * 0.05) + 0.8 * Math.sin((x + z) * 0.11);
  h *= 1 - cityMask(x, z); // the city is flat
  const space = Math.hypot(x - SPACE.x, z - SPACE.z);
  if (space < SPACE.radius) {
    const k = space / SPACE.radius;
    h = h * k + (1 - k) * (-1 + 0.5 * Math.sin(x * 0.3) * Math.cos(z * 0.3));
  }
  const volcano = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
  if (volcano < VOLCANO.radius) {
    const cone = volcano < VOLCANO.craterRadius ? VOLCANO.height - 3 : VOLCANO.height * (1 - volcano / VOLCANO.radius);
    h = Math.max(h, cone);
  }
  const edge = Math.max(Math.abs(x), Math.abs(z)) - (MAP_SIZE - 10);
  if (edge > 0) h += edge * 1.5; // hills around the edge of the world
  return h;
}

const ZONE_COLORS = { grass: 0x5aa83c, city: 0x6b6b6b, space: 0x9e9e9e, volcano: 0x6d3b2a, arena: 0x3a2350 };

export class AdventureWorld {
  constructor({ container, save, onExit }) {
    this.container = container;
    this.save = save;
    this.onExit = onExit;
    save.adventure ??= { opened: [], superBossBeaten: false };
    this.character = getCharacter(save.selected);
    this.settings = getDifficulty(save.difficulty);
    this.powerUps = save.powerUps;
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.now = performance.now();
    this.ended = false;
    this.solids = [];
    this.shots = [];
    this.effects = [];

    this.setUpRenderer();
    this.build();
    this.createPlayer();
    this.createHud();
    this.listen();

    audio.setMuted(save.muted);
    this.begin();
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  // ---------- What makes this world (a world that extends this class replaces these) ----------

  build() {
    this.createLand();
    this.createCity();
    this.createSpace();
    this.createVolcano();
    this.createTreesAndCaves();
    this.createDoor();
    this.createArena();
    this.createChests();
  }

  begin() {
    audio.playMusic('menu');
    this.hud.message(t('adv.title'), t('adv.intro'), 4000);
  }

  get spawn() {
    return SPAWN;
  }

  groundAt(x, z) {
    return groundHeight(x, z);
  }

  zoneAt(x, z) {
    return zoneAt(x, z);
  }

  zoneName(zone) {
    return t(`adv.${zone}`);
  }

  // Stay on the island (or inside the arena)
  keepInside(p) {
    if (this.inArena) {
      const away = vec(p.pos.x - ARENA.x, 0, p.pos.z - ARENA.z);
      if (away.length() > ARENA.radius - 1) {
        away.setLength(ARENA.radius - 1);
        p.pos.x = ARENA.x + away.x;
        p.pos.z = ARENA.z + away.z;
      }
    } else {
      p.pos.x = THREE.MathUtils.clamp(p.pos.x, -MAP_SIZE + 2, MAP_SIZE - 2);
      p.pos.z = THREE.MathUtils.clamp(p.pos.z, -MAP_SIZE + 2, MAP_SIZE - 2);
    }
  }

  updateWorld(dt) {
    this.updateGuards(dt);
    this.updateChestsAndDoor();
    this.updateBoss(dt);
  }

  // ---------- Setup ----------

  setUpRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.container.style.position = 'relative';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 170);
    this.camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 600);
    this.resize = () => {
      const { clientWidth: width, clientHeight: height } = this.container;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    this.resize();
    window.addEventListener('resize', this.resize);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5a3a, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(40, 80, 30);
    this.scene.add(sun);
  }

  // One big ground mesh, colored by zone.
  createLand() {
    const size = MAP_SIZE * 2;
    const geometry = new THREE.PlaneGeometry(size, size, 120, 120);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, groundHeight(x, z));
      color.setHex(ZONE_COLORS[zoneAt(x, z)]);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })));

    // The sea all around
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0x1e88e5 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -2;
    this.scene.add(sea);
  }

  addSolid(minX, maxX, minY, maxY, minZ, maxZ, extra = {}) {
    const solid = { minX, maxX, minY, maxY, minZ, maxZ, ...extra };
    this.solids.push(solid);
    return solid;
  }

  createCity() {
    BUILDINGS.forEach(([x, z, width, depth, height], i) => {
      const building = models.makeBuilding(width, depth, height, i);
      building.position.set(x, 0, z);
      this.scene.add(building);
      this.addSolid(x - width / 2, x + width / 2, 0, height, z - depth / 2, z + depth / 2);
    });
  }

  // A dark "space bubble" with stars, low gravity, floating rocks and a little rocket.
  createSpace() {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(SPACE.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0b1030, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    bubble.position.set(SPACE.x, -2, SPACE.z);
    this.scene.add(bubble);
    const stars = [];
    for (let i = 0; i < 300; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(SPACE.radius - 1);
      stars.push(SPACE.x + v.x, Math.abs(v.y) + 2, SPACE.z + v.z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    this.scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35 })));

    for (const [x, z, above, size] of FLOATING_ROCKS) {
      const y = groundHeight(x, z) + above;
      const rock = models.makeRock(size, 1, size, 0x7e57c2);
      rock.position.set(x, y - 1, z);
      this.scene.add(rock);
      this.addSolid(x - size / 2, x + size / 2, y - 1, y, z - size / 2, z + size / 2);
    }
    const rocket = heroModels.makeRocket();
    rocket.position.set(SPACE.x + 8, groundHeight(SPACE.x + 8, SPACE.z + 10), SPACE.z + 10);
    this.scene.add(rocket);
  }

  createVolcano() {
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(VOLCANO.craterRadius, 24),
      new THREE.MeshBasicMaterial({ color: 0xff6d00 }),
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(VOLCANO.x, VOLCANO.height - 2.8, VOLCANO.z);
    this.scene.add(lava);
    this.lavaRivers = LAVA_RIVERS.map(([x, z, length, width, angle]) => {
      for (let i = 0; i < length; i += 1) {
        const px = x + Math.sin(angle) * (i - length / 2);
        const pz = z + Math.cos(angle) * (i - length / 2);
        const piece = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, 1.1), new THREE.MeshBasicMaterial({ color: 0xff8f00 }));
        piece.position.set(px, groundHeight(px, pz) + 0.05, pz);
        piece.rotation.y = angle;
        this.scene.add(piece);
      }
      return { x, z, length, width, angle };
    });
  }

  createTreesAndCaves() {
    let placed = 0;
    for (let i = 0; placed < 45 && i < 400; i++) {
      const x = (((i * 7919) % 230) - 115) * 0.95;
      const z = (((i * 104729) % 230) - 115) * 0.95;
      if (zoneAt(x, z) !== 'grass' || Math.hypot(x - SPAWN.x, z - SPAWN.z) < 8 || Math.hypot(x - DOOR.x, z - DOOR.z) < 10) continue;
      if (CHESTS.some((c) => Math.hypot(c.x - x, c.z - z) < 6) || CAVES.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 9)) continue;
      const tree = models.makeTree(i);
      tree.position.set(x, groundHeight(x, z), z);
      this.scene.add(tree);
      this.addSolid(x - 0.4, x + 0.4, tree.position.y, tree.position.y + 3, z - 0.4, z + 0.4);
      placed += 1;
    }

    // Caves: a rock tunnel with a roof. The chest inside is hidden from above.
    for (const [x, z, angle] of CAVES) {
      const base = groundHeight(x, z);
      const along = angle === 0; // the tunnel runs along x (angle 0) or along z
      const length = 12;
      for (const side of [-1, 1]) {
        const wx = along ? x : x + side * 3;
        const wz = along ? z + side * 3 : z;
        const w = along ? length : 1.5;
        const d = along ? 1.5 : length;
        const wall = models.makeRock(w, 5, d);
        wall.position.set(wx, base - 1, wz);
        this.scene.add(wall);
        this.addSolid(wx - w / 2, wx + w / 2, base - 1, base + 4, wz - d / 2, wz + d / 2);
      }
      const rw = along ? length : 7.5;
      const rd = along ? 7.5 : length;
      const roof = models.makeRock(rw, 2, rd, 0x5d5d5d);
      roof.position.set(x, base + 4, z);
      this.scene.add(roof);
      this.addSolid(x - rw / 2, x + rw / 2, base + 4, base + 6, z - rd / 2, z + rd / 2);
    }
  }

  createDoor() {
    const { group, door, slots } = models.makeDoor();
    const y = groundHeight(DOOR.x, DOOR.z);
    group.position.set(DOOR.x, y, DOOR.z);
    this.scene.add(group);
    this.door = { group, door, slots, y };
    this.addSolid(DOOR.x - 4, DOOR.x - 2.8, y, y + 8, DOOR.z - 0.8, DOOR.z + 0.8);
    this.addSolid(DOOR.x + 2.8, DOOR.x + 4, y, y + 8, DOOR.z - 0.8, DOOR.z + 0.8);
    this.doorSolid = this.addSolid(DOOR.x - 2.8, DOOR.x + 2.8, y, y + 7.6, DOOR.z - 0.4, DOOR.z + 0.4);
    this.updateDoor(false);
  }

  get piecesFound() {
    return CHESTS.filter((c) => c.reward === 'piece' && this.save.adventure.opened.includes(c.id)).length;
  }

  // Light up one slot per puzzle piece; with all of them, the door slides open.
  updateDoor(animate) {
    const found = this.piecesFound;
    this.door.slots.forEach((slot, i) => {
      slot.material.color.setHex(i < found ? 0x00e5ff : 0x263238);
      slot.material.emissive.setHex(i < found ? 0x00838f : 0x000000);
    });
    if (found < PIECES_NEEDED || this.doorOpen) return;
    this.doorOpen = true;
    this.solids = this.solids.filter((s) => s !== this.doorSolid);
    if (!animate) {
      this.door.door.position.y = -4;
      return;
    }
    this.doorSlide = { from: this.door.door.position.y, startedAt: this.now };
  }

  // The super boss arena: a round floor far away, with glowing pillars around it.
  createArena() {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA.radius + 6, 48), new THREE.MeshStandardMaterial({ color: 0x3a2350 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA.x, 0.02, ARENA.z);
    this.scene.add(floor);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const pillar = models.makeRock(1.4, 9, 1.4, 0x4a148c);
      pillar.position.set(ARENA.x + Math.cos(angle) * (ARENA.radius + 2), 0, ARENA.z + Math.sin(angle) * (ARENA.radius + 2));
      this.scene.add(pillar);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd500f9 }));
      flame.position.set(pillar.position.x, 9.5, pillar.position.z);
      this.scene.add(flame);
    }
  }

  createChests() {
    this.chests = CHESTS.map((data) => {
      const { group, lid, chains } = models.makeChest();
      const y = data.y ?? groundHeight(data.x, data.z) + (data.above ?? 0);
      group.position.set(data.x, y, data.z);
      this.scene.add(group);
      const opened = this.save.adventure.opened.includes(data.id);
      const chest = { ...data, y, group, lid, chains, opened, guards: [] };
      if (opened) {
        lid.rotation.x = -1.9;
        chains.visible = false;
        return chest;
      }
      chest.guards = data.guards.map(([kind, dx, dz]) => {
        const mesh = kind === 'apple' ? heroModels.makeApple() : kind === 'robot' ? heroModels.makeRobot() : heroModels.makeSunglasses();
        this.scene.add(mesh);
        const x = data.x + dx;
        const z = data.z + dz;
        const onTop = data.y !== undefined || data.above !== undefined; // guards on a roof or rock stand up there too
        const y = onTop ? chest.y : groundHeight(x, z);
        return {
          kind,
          mesh,
          chest,
          home: vec(x, y, z),
          pos: vec(x, y, z),
          angle: Math.atan2(dz, dx),
          alive: true,
          nextShotAt: 0,
          shotEveryMs: kind === 'apple' ? 2000 : 1600,
          phase: Math.random() * 6,
        };
      });
      chains.visible = chest.guards.length > 0;
      return chest;
    });
    this.guards = this.chests.flatMap((c) => c.guards);
  }

  createPlayer() {
    this.palette = this.save.keys.includes('world3') ? this.save.palette ?? 0 : 0;
    this.player = {
      pos: vec(this.spawn.x, this.groundAt(this.spawn.x, this.spawn.z), this.spawn.z),
      vel: vec(0, 0, 0),
      forward: vec(this.spawn.facing[0], 0, this.spawn.facing[1]),
      onGround: true,
      airJumpsLeft: 0,
      hearts: this.settings.hearts,
      safeUntil: 0,
      hurtAt: -Infinity,
      nextAttackAt: 0,
      attackIndex: 0,
      until: {},
      readyAt: {},
      mechaUsed: false,
      tongue: null,
    };
    this.checkpoint = { x: this.spawn.x, z: this.spawn.z };
    this.buildHeroModel();
    this.mechaModel = heroModels.makeMecha();
    this.mechaModel.visible = false;
    this.scene.add(this.mechaModel);
    if (this.character.fireAura) {
      this.aura = heroModels.makeAura(this.character.auraColor);
      this.scene.add(this.aura);
    }
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);
    this.camera.position.copy(this.player.pos).add(vec(0, 5, 9));
  }

  // (Re)build the hero's 3D model, e.g. after finding a new hat.
  buildHeroModel() {
    if (this.heroModel) this.scene.remove(this.heroModel);
    const { group, legs, cape } = heroModels.makeHero(this.character.id, this.palette, this.save.wearing?.[this.character.id]);
    this.heroMaterials = [];
    group.traverse((part) => {
      if (!part.material) return;
      part.material = part.material.clone();
      part.material.transparent = true;
      this.heroMaterials.push(part.material);
    });
    this.heroModel = group;
    this.heroLegs = legs;
    this.heroCape = cape;
    this.scene.add(group);
  }

  createHud() {
    const attack = t(`game.attack.${this.character.attack}`);
    this.hud = new Hud(this.container, {
      title: t('adv.title'),
      difficulty: t(`difficulty.${this.save.difficulty}`),
      hint: this.character.doubleJump ? `${attack}   ${t('game.jumpTwice')}` : attack,
      controls: t('game.controls3d'),
      menu: `${t('game.sound')}   ${t('game.menu')}`,
      maxHearts: this.settings.hearts,
      crystals: PIECES_NEEDED,
      bossName: '',
      itemIcon: '🧩',
    });
    if (this.save.touch) this.hud.hideKeyboardHints();
    this.hud.setHearts(this.player.hearts);
    this.hud.setBolts(this.save.bolts);
    this.hud.setCrystals(this.piecesFound);
  }

  listen() {
    this.onKeyDown = (event) => {
      if (!this.keysDown.has(event.code)) this.keysPressed.add(event.code);
      this.keysDown.add(event.code);
      if (event.code === 'Escape') this.exit();
      if (event.code === 'KeyM') {
        this.save.muted = !this.save.muted;
        writeSave(this.save);
        audio.setMuted(this.save.muted);
      }
    };
    this.onKeyUp = (event) => this.keysDown.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  down(...codes) {
    return codes.some((code) => this.keysDown.has(code));
  }

  pressed(...codes) {
    return codes.some((code) => this.keysPressed.has(code));
  }

  active(power) {
    return this.now < (this.player.until[power] ?? 0);
  }

  get body() {
    return this.player.pos.clone().addScaledVector(UP, 0.6);
  }

  // ---------- Every frame ----------

  loop(time) {
    if (this.ended) return;
    const dt = Math.min((time - this.lastFrame) / 1000, 0.05);
    this.lastFrame = time;
    this.now = performance.now();

    if (!this.won) {
      this.updatePlayer(dt);
      this.updatePowers();
      this.updateWorld(dt);
    }
    this.updateShots(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);

    this.keysPressed.clear();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  updatePlayer(dt) {
    const p = this.player;
    const turn = (this.down('ArrowLeft', 'KeyA') ? 1 : 0) - (this.down('ArrowRight', 'KeyD') ? 1 : 0);
    p.forward.applyAxisAngle(UP, turn * TURN_SPEED * dt);
    const move = (this.down('ArrowUp', 'KeyW') ? 1 : 0) - (this.down('ArrowDown', 'KeyS') ? 1 : 0);
    const zone = this.zoneAt(p.pos.x, p.pos.z);
    const inSpace = zone === 'space';
    const bouncing = this.now < p.hurtAt + 300;
    const speed = RUN_SPEED * (this.active('shadow') ? SHADOW_SPEED : 1);
    const previousY = p.pos.y;

    if (!bouncing) {
      p.vel.x = p.forward.x * move * (this.active('fly') ? FLY_SPEED : speed);
      p.vel.z = p.forward.z * move * (this.active('fly') ? FLY_SPEED : speed);
    }
    if (this.active('fly')) {
      p.vel.y = this.down('Space') ? 6 : 0;
    } else {
      p.vel.y -= (inSpace ? SPACE_GRAVITY : GRAVITY) * dt;
      if (this.pressed('Space')) {
        if (p.onGround) {
          p.vel.y = inSpace ? SPACE_JUMP_SPEED : JUMP_SPEED;
          audio.play('jump');
        } else if (p.airJumpsLeft > 0) {
          p.airJumpsLeft -= 1;
          p.vel.y = inSpace ? SPACE_JUMP_SPEED : JUMP_SPEED;
          audio.play('doubleJump');
        }
      }
    }

    p.pos.addScaledVector(p.vel, dt);
    p.onGround = false;
    this.collide(previousY);

    const ground = this.groundAt(p.pos.x, p.pos.z);
    if (p.pos.y <= ground) {
      p.pos.y = ground;
      if (p.vel.y < 0) p.vel.y = 0;
      p.onGround = true;
    }
    if (p.onGround) p.airJumpsLeft = this.character.doubleJump ? 1 : 0;

    this.keepInside(p);

    if (this.onLava()) {
      this.hurt(p.pos.clone().add(p.forward));
      p.vel.y = 9;
      if (this.now > (this.lavaMessageAt ?? 0)) {
        this.lavaMessageAt = this.now + 3000;
        this.hud.message('', t('adv.lava'), 1200);
      }
    }

    if (zone !== this.zone && zone !== 'arena') {
      if (this.zone && zone !== 'grass') this.hud.message(this.zoneName(zone), '', 1800);
      this.zone = zone;
    }

    // Model, running legs, cape, invisible/shadow look, Mecha suit
    this.heroModel.position.copy(p.pos);
    orient(this.heroModel, p.forward);
    const running = p.onGround && move !== 0;
    this.heroLegs.forEach((leg, i) => (leg.rotation.x = running ? Math.sin(this.now / 60 + i * Math.PI) * 0.6 : 0));
    this.heroCape.rotation.x = running || !p.onGround ? 1.1 : 0.5;
    const blinking = this.now < p.safeUntil && Math.floor(this.now / 100) % 2 === 0;
    const mecha = this.active('mecha');
    this.heroModel.visible = !blinking && !mecha;
    for (const material of this.heroMaterials) material.opacity = this.active('invisible') ? 0.25 : this.active('shadow') ? 0.45 : 1;
    this.mechaModel.visible = mecha && !blinking;
    this.mechaModel.position.copy(p.pos);
    this.mechaModel.rotation.copy(this.heroModel.rotation);
    if (this.aura) this.aura.position.copy(this.body);

    if (this.down('KeyX')) this.attack();
    this.updateTongue();
  }

  // Bump into buildings, rocks, trees and cave walls; land on top of them.
  collide(previousY) {
    const p = this.player;
    for (const s of this.solids) {
      if (p.pos.x + RADIUS <= s.minX || p.pos.x - RADIUS >= s.maxX || p.pos.z + RADIUS <= s.minZ || p.pos.z - RADIUS >= s.maxZ) continue;
      if (p.pos.y >= s.maxY || p.pos.y + HEIGHT <= s.minY) continue;
      if (previousY >= s.maxY - 0.05 && p.vel.y <= 0) {
        p.pos.y = s.maxY;
        p.vel.y = 0;
        p.onGround = true;
        continue;
      }
      if (previousY + HEIGHT <= s.minY + 0.05 && p.vel.y > 0) {
        p.pos.y = s.minY - HEIGHT;
        p.vel.y = 0;
        continue;
      }
      // Push out sideways, the shortest way
      const pushes = [
        [s.minX - RADIUS - p.pos.x, 'x'],
        [s.maxX + RADIUS - p.pos.x, 'x'],
        [s.minZ - RADIUS - p.pos.z, 'z'],
        [s.maxZ + RADIUS - p.pos.z, 'z'],
      ];
      const [amount, axis] = pushes.reduce((best, push) => (Math.abs(push[0]) < Math.abs(best[0]) ? push : best));
      p.pos[axis] += amount;
    }
  }

  onLava() {
    const p = this.player;
    if (!p.onGround) return false;
    const dv = Math.hypot(p.pos.x - VOLCANO.x, p.pos.z - VOLCANO.z);
    if (dv < VOLCANO.craterRadius - 0.5) return true;
    return this.lavaRivers.some(({ x, z, length, width, angle }) => {
      const dx = p.pos.x - x;
      const dz = p.pos.z - z;
      const along = dx * Math.sin(angle) + dz * Math.cos(angle);
      const across = dx * Math.cos(angle) - dz * Math.sin(angle);
      return Math.abs(along) < length / 2 && Math.abs(across) < width / 2;
    });
  }

  // ---------- Powers (C, V, F, R, Q) ----------

  startPower(power, sound) {
    const p = this.player;
    if (this.active(power) || this.now < (p.readyAt[power] ?? 0)) return;
    p.until[power] = this.now + POWER_MS[power];
    audio.play(sound);
  }

  updatePowers() {
    const p = this.player;
    if (this.pressed('KeyC') && this.character.invisibility) this.startPower('invisible', 'invisible');
    if (this.pressed('KeyC') && this.character.shadow) this.startPower('shadow', 'shadow');
    if (this.pressed('KeyV') && this.powerUps.includes('shield')) this.startPower('shield', 'shield');
    if (this.pressed('KeyF') && this.powerUps.includes('fly')) this.startPower('fly', 'fly');
    if (this.pressed('KeyR') && this.powerUps.includes('mecha-capybara') && !p.mechaUsed) {
      p.mechaUsed = true;
      this.startPower('mecha', 'mecha');
    }
    if (this.pressed('KeyZ') && this.powerUps.includes('freeze')) this.useFreezeRay(this.guards);
    this.meltIce(this.guards);
    if (this.pressed('KeyQ') && this.character.attacks) {
      p.attackIndex = (p.attackIndex + 1) % this.character.attacks.length;
      audio.play('click');
      this.hud.message('', t(`game.attack.${this.currentAttack}`), 1000);
    }
    // When a power runs out, start its wait
    for (const power of Object.keys(POWER_MS)) {
      if (p.until[power] && !this.active(power)) {
        p.until[power] = 0;
        if (power !== 'mecha') p.readyAt[power] = this.now + POWER_WAIT_MS;
      }
    }
    this.shieldMesh.visible = this.active('shield');
    if (this.shieldMesh.visible) this.shieldMesh.position.copy(this.body);

    const seconds = (ms) => Math.ceil(ms / 1000);
    const status = (key, name, power) => {
      if (this.active(power)) return `${name}! ${seconds(p.until[power] - this.now)}`;
      if (this.now < (p.readyAt[power] ?? 0)) return `${key} = ${name}: ${t('game.wait', { seconds: seconds(p.readyAt[power] - this.now) })}`;
      return `${key} = ${name}: ${t('game.ready')}`;
    };
    const parts = [];
    if (this.character.attacks) parts.push(`Q = ${t('game.switch')}`);
    if (this.character.invisibility) parts.push(status('C', t('game.invisible'), 'invisible'));
    if (this.character.shadow) parts.push(status('C', t('game.shadow'), 'shadow'));
    if (this.powerUps.includes('shield')) parts.push(status('V', t('game.shield'), 'shield'));
    if (this.powerUps.includes('fly')) parts.push(status('F', t('game.fly'), 'fly'));
    if (this.powerUps.includes('freeze')) {
      if (this.frozen) parts.push(`${t('game.freeze')}! ${seconds(this.freezeUntil - this.now)}`);
      else if (this.now < (this.freezeReadyAt ?? 0)) parts.push(`Z = ${t('game.freeze')}: ${t('game.wait', { seconds: seconds(this.freezeReadyAt - this.now) })}`);
      else parts.push(`Z = ${t('game.freeze')}: ${t('game.ready')}`);
    }
    if (this.powerUps.includes('mecha-capybara')) {
      parts.push(p.mechaUsed && !this.active('mecha') ? `R = ${t('game.mecha')}: ${t('game.used')}` : status('R', t('game.mecha'), 'mecha'));
    }
    this.hud.setPower(parts.join('     '));
  }

  get currentAttack() {
    if (this.active('mecha')) return 'rocket';
    return this.character.attacks ? this.character.attacks[this.player.attackIndex] : this.character.attack;
  }

  get unhurtable() {
    return this.active('invisible') || this.active('shadow') || this.active('mecha');
  }

  // ---------- Attacks ----------

  attack() {
    const p = this.player;
    if (this.now < p.nextAttackAt) return;
    const kind = this.currentAttack;
    p.nextAttackAt = this.now + ATTACK_COOLDOWN_MS[kind];
    const start = this.body.addScaledVector(UP, 0.3).addScaledVector(p.forward, 0.9);

    if (kind === 'scratch') {
      audio.play('scratch');
      this.scratch();
    } else if (kind === 'tongue') {
      audio.play('tongue');
      p.tongue = { startedAt: this.now, hit: false };
    } else {
      const look = {
        laser: [0xff2020, 0.14, 1.3, 1, 'laser'],
        superLaser: [0xff4fd8, 0.3, 1.8, 2, 'superLaser'],
        goldLaser: [0xffd54f, 0.3, 1.8, 2, 'superLaser'],
        rocket: [0xff7043, 0.35, 1.4, 3, 'rocketShot'],
        moon: [0xd50000, 0.35, 0.7, 2, 'moon'],
      }[kind];
      const [color, thick, length, damage, sound] = look;
      audio.play(sound);
      const mesh = new THREE.Mesh(
        kind === 'moon' ? new THREE.SphereGeometry(thick, 12, 10) : new THREE.BoxGeometry(thick, thick, length),
        new THREE.MeshBasicMaterial({ color }),
      );
      this.addShot({ mesh, pos: start, vel: p.forward.clone().multiplyScalar(kind === 'moon' ? 16 : SHOT_SPEED), life: kind === 'moon' ? 2 : SHOT_LIFE, damage, fromPlayer: true, homing: kind === 'moon' });
    }
  }

  addShot(shot) {
    shot.mesh.position.copy(shot.pos);
    this.scene.add(shot.mesh);
    this.shots.push(shot);
  }

  // Everything you can hit: living guards, and the super boss when it's hittable.
  targets() {
    const list = this.guards.filter((g) => g.alive).map((g) => ({ point: this.guardCenter(g), radius: 1, hit: () => this.defeatGuard(g) }));
    if (this.bossHittable()) list.push({ point: this.bossCenter(), radius: BOSS_HIT_RADIUS[this.boss.phase], hit: (damage) => this.hitBoss(damage) });
    return list;
  }

  scratch() {
    const p = this.player;
    const body = this.body;
    const slash = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      line.position.x = i * 0.3;
      line.rotation.z = 0.5;
      slash.add(line);
    }
    slash.position.copy(body).addScaledVector(p.forward, 1.2);
    orient(slash, p.forward);
    this.addEffect(slash, 0.2, (mesh, k) => mesh.scale.setScalar(1 + k * 0.4));
    for (const target of this.targets()) {
      const to = target.point.clone().sub(body);
      if (to.length() < SCRATCH_REACH + target.radius - 1 && to.dot(p.forward) > -0.2) target.hit(2);
    }
  }

  updateTongue() {
    const p = this.player;
    if (p.tongueMesh) {
      this.scene.remove(p.tongueMesh);
      p.tongueMesh = null;
    }
    if (!p.tongue) return;
    const k = (this.now - p.tongue.startedAt) / 260;
    if (k >= 1) {
      p.tongue = null;
      return;
    }
    const length = TONGUE_REACH * Math.sin(Math.PI * k);
    const mouth = this.body.addScaledVector(p.forward, 0.9);
    p.tongueMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, length, 6), new THREE.MeshBasicMaterial({ color: 0xff6fa8 }));
    p.tongueMesh.position.copy(mouth).addScaledVector(p.forward, length / 2);
    p.tongueMesh.quaternion.setFromUnitVectors(UP, p.forward);
    this.scene.add(p.tongueMesh);
    if (p.tongue.hit) return;
    for (const target of this.targets()) {
      const along = target.point.clone().sub(mouth).dot(p.forward);
      if (along < 0 || along > length) continue;
      if (target.point.distanceTo(mouth.clone().addScaledVector(p.forward, along)) < target.radius) {
        target.hit(1);
        p.tongue.hit = true;
        break;
      }
    }
  }

  updateShots(dt) {
    const body = this.body;
    for (const shot of this.shots) {
      shot.life -= dt;
      if (shot.homing) {
        const nearest = this.targets().sort((a, b) => a.point.distanceTo(shot.pos) - b.point.distanceTo(shot.pos))[0];
        if (nearest && nearest.point.distanceTo(shot.pos) < 18) {
          shot.vel.lerp(nearest.point.clone().sub(shot.pos).setLength(16), 0.12);
        }
      }
      shot.pos.addScaledVector(shot.vel, dt);
      shot.mesh.position.copy(shot.pos);
      if (shot.vel.lengthSq() > 0) shot.mesh.lookAt(shot.pos.clone().add(shot.vel));
      if (shot.pos.y < this.groundAt(shot.pos.x, shot.pos.z) - 0.2) shot.life = 0;

      if (shot.fromPlayer) {
        const target = this.targets().find((x) => x.point.distanceTo(shot.pos) < x.radius);
        if (target) {
          target.hit(shot.damage, shot);
          shot.life = 0;
        }
      } else if (!this.won) {
        const toShot = shot.pos.clone().sub(body);
        if (this.active('shield') && toShot.length() < 1.6) {
          shot.life = 0;
        } else if (toShot.length() < (shot.radius ?? 0.8)) {
          this.hurt(shot.pos);
          shot.life = 0;
        }
      }
    }
    for (const shot of this.shots.filter((s) => s.life <= 0)) this.scene.remove(shot.mesh);
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  enemyShot(from, toward, speed, color = 0xffa000, size = 0.2) {
    audio.play('enemyShot');
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color }));
    const vel = toward.clone().sub(from).setLength(speed);
    this.addShot({ mesh, pos: from.clone(), vel, life: 3.5, fromPlayer: false, radius: size + 0.6 });
  }

  // ---------- Guards ----------

  guardCenter(guard) {
    return guard.pos.clone().addScaledVector(UP, guard.kind === 'sunglasses' ? 1 : 0.5);
  }

  updateGuards(dt) {
    const p = this.player;
    const body = this.body;
    for (const guard of this.guards) {
      if (!guard.alive) continue;
      if (guard.ice) {
        // Frozen: stays still inside its ice cube (and can't hurt you)
        guard.ice.position.copy(this.guardCenter(guard));
        continue;
      }
      if (guard.kind === 'robot') {
        // Walk in a circle around the chest
        guard.angle += dt * 0.6;
        const x = guard.chest.x + Math.cos(guard.angle) * 4;
        const z = guard.chest.z + Math.sin(guard.angle) * 4;
        guard.pos.set(x, guard.chest.y > groundHeight(x, z) + 0.5 ? guard.chest.y : groundHeight(x, z), z);
      }
      const bob = guard.kind === 'sunglasses' ? 0.3 * Math.sin(this.now / 400 + guard.phase) : 0;
      guard.mesh.position.copy(guard.pos).addScaledVector(UP, bob);
      const toPlayer = body.clone().sub(this.guardCenter(guard));
      const flat = vec(toPlayer.x, 0, toPlayer.z);
      if (flat.lengthSq() > 0.01 && toPlayer.length() < GUARD_SEE + 4) orient(guard.mesh, flat);

      // Touching a guard: stomp it, smash it, or get hurt
      if (toPlayer.length() < 1.2) {
        if (p.vel.y < 0 && p.pos.y > guard.pos.y + 0.6) {
          this.defeatGuard(guard);
          p.vel.y = JUMP_SPEED * 0.8;
          audio.play('stomp');
        } else if (this.character.fireAura || this.active('mecha')) {
          this.defeatGuard(guard);
        } else {
          this.hurt(guard.pos);
        }
        continue;
      }

      if (guard.kind === 'sunglasses' || this.active('invisible') || toPlayer.length() > GUARD_SEE) continue;
      if (!guard.nextShotAt) guard.nextShotAt = this.now + this.settings.enemyFirstShotMs;
      if (this.now < guard.nextShotAt) continue;
      guard.nextShotAt = this.now + guard.shotEveryMs * this.settings.enemyShotSlowdown;
      this.enemyShot(this.guardCenter(guard), body, this.settings.enemyShotSpeed / 30);
    }
  }

  defeatGuard(guard) {
    if (!guard.alive) return;
    guard.alive = false;
    this.scene.remove(guard.mesh);
    // A frozen guard shatters, for double bolts
    audio.play(guard.ice ? 'shatter' : 'pop');
    this.addBolts(guard.ice ? BAD_GUY_REWARD * 2 : BAD_GUY_REWARD);
    this.pop(this.guardCenter(guard), 0xffffff);
    if (guard.chest.guards.every((g) => !g.alive)) guard.chest.chains.visible = false;
    if (this.active('invisible')) this.player.until.invisible = this.now; // seen again after a hit
  }

  // ---------- Chests and the secret door ----------

  updateChestsAndDoor() {
    const p = this.player;
    for (const chest of this.chests) {
      if (chest.opened) continue;
      const near = Math.hypot(p.pos.x - chest.x, p.pos.z - chest.z) < 1.8 && Math.abs(p.pos.y - chest.y) < 1.5;
      if (!near) continue;
      if (chest.guards.some((g) => g.alive)) {
        if (this.now > (this.guardMessageAt ?? 0)) {
          this.guardMessageAt = this.now + 2500;
          audio.play('error');
          this.hud.message('', t('adv.guarded'), 1500);
        }
        continue;
      }
      this.openChest(chest);
    }

    if (this.doorSlide) {
      const k = Math.min(1, (this.now - this.doorSlide.startedAt) / 2000);
      this.door.door.position.y = this.doorSlide.from - k * 8;
      if (k === 1) this.doorSlide = null;
    }

    // Walk into the door: locked, or off to the super boss
    const atDoor = Math.abs(p.pos.x - DOOR.x) < 2.8 && Math.abs(p.pos.z - DOOR.z) < 1.4 && !this.inArena;
    if (atDoor && this.doorOpen) this.startSuperBoss();
    const nearDoor = Math.abs(p.pos.x - DOOR.x) < 3 && Math.abs(p.pos.z - DOOR.z) < 2.5;
    if (nearDoor && !this.doorOpen && this.now > (this.doorMessageAt ?? 0)) {
      this.doorMessageAt = this.now + 4000;
      this.hud.message('', t('adv.doorLocked'), 2500);
    }
  }

  openChest(chest) {
    chest.opened = true;
    this.save.adventure.opened.push(chest.id);
    chest.lidOpenedAt = this.now;
    this.addEffect(chest.lid, 0.5, (lid, k) => (lid.rotation.x = -1.9 * k), false);
    audio.play('crystal');
    this.pop(vec(chest.x, chest.y + 1.5, chest.z), 0xffd23f);

    if (chest.reward === 'bolts') {
      this.addBolts(CHEST_BOLTS);
      this.hud.message('', t('adv.gotBolts', { count: CHEST_BOLTS * (this.save.powerUps.includes('double') ? 2 : 1) }), 2500);
    } else if (chest.reward === 'piece') {
      const count = this.piecesFound;
      this.hud.setCrystals(count);
      if (count >= PIECES_NEEDED) {
        this.hud.message(t('adv.gotPiece', { count }), t('adv.allPieces'), 4000);
        audio.play('forceField');
      } else {
        this.hud.message('', t('adv.gotPiece', { count }), 2500);
      }
      this.updateDoor(true);
    } else {
      // A hat! Put it on right away (it can be changed later in the wardrobe)
      this.save.hats ??= [];
      if (!this.save.hats.includes(chest.reward)) this.save.hats.push(chest.reward);
      this.save.wearing ??= {};
      this.save.wearing[this.character.id] = chest.reward;
      this.buildHeroModel();
      this.hud.message('', t('adv.gotHat', { hat: t(`hat.${chest.reward}`) }), 2500);
    }
    writeSave(this.save);
  }

  addBolts(amount) {
    this.save.bolts += amount * (this.save.powerUps.includes('double') ? 2 : 1);
    writeSave(this.save);
    this.hud.setBolts(this.save.bolts);
  }

  // ---------- Getting hurt ----------

  hurt(fromPos) {
    const p = this.player;
    if (this.won || this.unhurtable || this.now < p.safeUntil) return;
    audio.play('hurt');
    p.hearts -= 1;
    p.safeUntil = this.now + this.settings.hurtSafeMs;
    if (p.hearts <= 0) {
      p.hearts = this.settings.hearts;
      this.hud.setHearts(p.hearts);
      this.respawn();
      return;
    }
    this.hud.setHearts(p.hearts);
    const away = p.pos.clone().sub(fromPos);
    away.y = 0;
    if (away.lengthSq() > 0) away.setLength(4);
    p.vel.set(away.x, 5, away.z);
    p.hurtAt = this.now;
  }

  // Out of hearts: back outside (the boss fight starts over next time).
  respawn() {
    const p = this.player;
    if (this.inArena) this.leaveArena();
    p.pos.set(this.checkpoint.x, this.groundAt(this.checkpoint.x, this.checkpoint.z), this.checkpoint.z);
    p.vel.set(0, 0, 0);
    p.safeUntil = this.now + this.settings.hurtSafeMs;
  }

  // ---------- The SUPER BOSS: Evil Capybara, then the MEGA MONSTER ----------

  bossHittable() {
    return this.boss && (this.boss.state === 'fighting' || this.boss.state === 'jumping');
  }

  bossCenter() {
    return this.boss.pos.clone().addScaledVector(UP, this.boss.phase === 'giant' ? 4.5 : 1.2);
  }

  startSuperBoss() {
    this.inArena = true;
    this.checkpoint = { x: DOOR.x, z: DOOR.z + 4 };
    const p = this.player;
    p.pos.set(ARENA.x, 0, ARENA.z + ARENA.radius - 6);
    p.vel.set(0, 0, 0);
    p.forward.set(0, 0, -1);
    p.mechaUsed = false;
    this.scene.fog.color.setHex(0x1a0b2e);
    this.scene.background = new THREE.Color(0x1a0b2e);
    audio.playMusic('boss');

    const { group, legs, cape } = models.makeEvilCapybara();
    this.scene.add(group);
    this.boss = {
      phase: 'evil',
      mesh: group,
      legs,
      cape,
      pos: vec(ARENA.x, 0, ARENA.z - 8),
      vel: vec(0, 0, 0),
      hp: this.settings.bossHp,
      maxHp: this.settings.bossHp,
      state: 'fighting',
      nextShotAt: this.now + 1500,
      nextJumpAt: this.now + 3000,
      strafe: 1,
    };
    this.hud.setBossName(t('adv.evilCapybara'));
    this.hud.showBoss(1);
    this.hud.message(`${t('adv.evilCapybara')}!`, '', 2000);
  }

  leaveArena() {
    this.inArena = false;
    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      if (this.boss.wave) this.scene.remove(this.boss.wave.ring);
      if (this.boss.marker) this.scene.remove(this.boss.marker);
    }
    this.boss = null;
    this.hud.hideBoss();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog.color.setHex(0x87ceeb);
    for (const shot of this.shots.filter((s) => !s.fromPlayer)) shot.life = 0;
    audio.playMusic('menu');
  }

  updateBoss(dt) {
    const boss = this.boss;
    if (!boss) return;
    const p = this.player;
    const toPlayer = vec(p.pos.x - boss.pos.x, 0, p.pos.z - boss.pos.z);

    if (boss.state === 'transforming') {
      this.updateTransform();
    } else if (boss.phase === 'evil') {
      this.updateEvilCapybara(dt, toPlayer);
    } else if (boss.state !== 'defeated') {
      this.updateMegaMonster(dt, toPlayer);
    }
    boss.mesh.position.copy(boss.pos);
    if (toPlayer.lengthSq() > 0.01 && boss.state !== 'defeated') orient(boss.mesh, toPlayer);
    this.updateWave();

    // Touching the boss hurts (unless you jump on Evil Capybara's head)
    if (!this.bossHittable()) return;
    const close = this.body.distanceTo(this.bossCenter()) < BOSS_HIT_RADIUS[boss.phase] + 0.4;
    if (!close) return;
    if (boss.phase === 'evil' && p.vel.y < 0 && p.pos.y > boss.pos.y + 1.6) {
      this.hitBoss(1);
      p.vel.y = JUMP_SPEED * 0.8;
      audio.play('stomp');
    } else if (this.character.fireAura || this.active('mecha')) {
      if (this.now > (boss.burnReadyAt ?? 0)) {
        boss.burnReadyAt = this.now + 300;
        this.hitBoss(1);
      }
    } else {
      this.hurt(boss.pos);
    }
  }

  // Part 1: runs circles around you, jumps, and shoots red lasers. Knows all your moves!
  updateEvilCapybara(dt, toPlayer) {
    const boss = this.boss;
    if (this.frozen) dt *= 0.4; // slowed down by the Freeze Ray
    const distance = toPlayer.length();
    const side = vec(-toPlayer.z, 0, toPlayer.x).normalize().multiplyScalar(boss.strafe);
    const wanted = distance > 9 ? toPlayer.clone().normalize() : distance < 5 ? toPlayer.clone().normalize().negate() : side;
    boss.vel.x = wanted.x * 6;
    boss.vel.z = wanted.z * 6;
    boss.vel.y -= GRAVITY * dt;
    boss.pos.addScaledVector(boss.vel, dt);
    if (boss.pos.y <= 0) {
      boss.pos.y = 0;
      boss.vel.y = 0;
    }
    const fromCenter = vec(boss.pos.x - ARENA.x, 0, boss.pos.z - ARENA.z);
    if (fromCenter.length() > ARENA.radius - 2) {
      fromCenter.setLength(ARENA.radius - 2);
      boss.pos.x = ARENA.x + fromCenter.x;
      boss.pos.z = ARENA.z + fromCenter.z;
      boss.strafe *= -1;
    }
    boss.legs.forEach((leg, i) => (leg.rotation.x = Math.sin(this.now / 60 + i * Math.PI) * 0.6));
    boss.cape.rotation.x = 1.1;

    if (this.now > boss.nextJumpAt && boss.pos.y === 0) {
      boss.vel.y = JUMP_SPEED;
      boss.strafe = Math.random() < 0.5 ? 1 : -1;
      boss.nextJumpAt = this.now + 2000 + Math.random() * 2000;
    }
    if (this.now > boss.nextShotAt && !this.active('invisible')) {
      boss.nextShotAt = this.now + 1200 * this.settings.enemyShotSlowdown;
      audio.play('laser');
      this.enemyShot(this.bossCenter(), this.body, (this.settings.enemyShotSpeed / 30) * 1.4, 0xff1744, 0.25);
    }
  }

  // Almost beaten, Evil Capybara calls the 3 bosses... and they melt together into the MEGA MONSTER.
  startTransform() {
    const boss = this.boss;
    boss.state = 'transforming';
    boss.vel.set(0, 0, 0);
    boss.pos.y = 0;
    this.hud.message('', t('adv.transform'), 3500);
    audio.play('bossRoar');
    const parts = [heroModels.makeGrapeBoss(), models.makeMegaMonster(), heroModels.makeGrapeBoss()];
    parts[1].scale.setScalar(0.35);
    boss.incoming = parts.map((mesh, i) => {
      const angle = (i / 3) * Math.PI * 2;
      const from = vec(ARENA.x + Math.cos(angle) * 30, 14, ARENA.z + Math.sin(angle) * 30);
      mesh.position.copy(from);
      this.scene.add(mesh);
      return { mesh, from };
    });
    boss.transformStartedAt = this.now;
  }

  updateTransform() {
    const boss = this.boss;
    const k = Math.min(1, (this.now - boss.transformStartedAt) / 2500);
    for (const part of boss.incoming) {
      part.mesh.position.copy(part.from).lerp(boss.pos.clone().addScaledVector(UP, 1), k);
      part.mesh.rotation.y += 0.2;
    }
    boss.mesh.rotation.y += 0.3;
    if (k < 1) return;
    for (const part of boss.incoming) this.scene.remove(part.mesh);
    this.scene.remove(boss.mesh);
    audio.play('explosion');
    this.shakeUntil = this.now + 800;
    this.pop(this.bossCenter(), 0xd500f9, 4);
    boss.phase = 'giant';
    boss.mesh = models.makeMegaMonster();
    this.scene.add(boss.mesh);
    boss.maxHp = Math.round(this.settings.bossHp * 1.5);
    boss.hp = boss.maxHp;
    boss.state = 'fighting';
    boss.nextActionAt = this.now + 2000;
    this.hud.setBossName(t('adv.giant'));
    this.hud.showBoss(1);
  }

  // Part 2: ground pounds (jump over the wave!), fire breath, and charging at you.
  updateMegaMonster(dt, toPlayer) {
    const boss = this.boss;
    if (boss.state === 'jumping') {
      const k = Math.min(1, (this.now - boss.jump.startedAt) / boss.jump.duration);
      boss.pos.copy(boss.jump.from).lerp(boss.jump.to, k).addScaledVector(UP, Math.sin(Math.PI * k) * 12);
      if (k === 1) {
        this.scene.remove(boss.marker);
        boss.marker = null;
        boss.state = 'fighting';
        this.groundPound();
      }
      return;
    }
    if (boss.charge) {
      const k = Math.min(1, (this.now - boss.charge.startedAt) / 900);
      boss.pos.copy(boss.charge.from).lerp(boss.charge.to, k);
      if (k === 1) boss.charge = null;
      return;
    }
    if (this.now < boss.nextActionAt || this.active('invisible')) return;
    if (this.frozen) {
      boss.nextActionAt = this.now + 1500; // slowed down by the Freeze Ray
      return;
    }
    boss.nextActionAt = this.now + this.settings.bossActionMs * 1.4;
    const action = ['pound', 'fire', 'charge'][Math.floor(Math.random() * 3)];
    const target = vec(this.player.pos.x, 0, this.player.pos.z);

    if (action === 'pound') {
      // A red ring shows where he'll land
      boss.marker = new THREE.Mesh(new THREE.TorusGeometry(3, 0.15, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
      boss.marker.rotation.x = Math.PI / 2;
      boss.marker.position.copy(target).setY(0.1);
      this.scene.add(boss.marker);
      boss.state = 'jumping';
      boss.jump = { from: boss.pos.clone(), to: target, startedAt: this.now, duration: 1600 * (this.settings.bossActionMs / 1800) };
    } else if (action === 'fire') {
      audio.play('fireBreath');
      const mouth = boss.pos.clone().addScaledVector(UP, 6.4).addScaledVector(toPlayer.clone().normalize(), 2);
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (!this.bossHittable() || this.ended) return;
          const aim = vec(this.player.pos.x, 0.6, this.player.pos.z);
          this.enemyShot(mouth, aim, (this.settings.enemyShotSpeed / 30) * 1.3, 0xff6d00, 0.45);
        }, i * 140);
      }
    } else {
      boss.charge = { from: boss.pos.clone(), to: target, startedAt: this.now };
    }
  }

  groundPound() {
    const boss = this.boss;
    audio.play('pound');
    this.shakeUntil = this.now + 600;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 6, 48), new THREE.MeshBasicMaterial({ color: 0xff9100 }));
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);
    if (boss.wave) this.scene.remove(boss.wave.ring);
    boss.wave = { center: boss.pos.clone(), startedAt: this.now, ring };
    if (this.body.distanceTo(this.bossCenter()) < 4.5) this.hurt(boss.pos);
  }

  updateWave() {
    const wave = this.boss?.wave;
    if (!wave) return;
    const radius = ((this.now - wave.startedAt) / 1000) * WAVE_SPEED;
    if (radius > ARENA.radius * 2) {
      this.scene.remove(wave.ring);
      this.boss.wave = null;
      return;
    }
    wave.ring.position.set(wave.center.x, 0.2, wave.center.z);
    wave.ring.scale.setScalar(Math.max(0.01, radius));
    const p = this.player;
    const distance = Math.hypot(p.pos.x - wave.center.x, p.pos.z - wave.center.z);
    if (p.onGround && Math.abs(distance - radius) < 0.7) this.hurt(wave.center);
  }

  hitBoss(amount) {
    const boss = this.boss;
    if (!this.bossHittable()) return;
    boss.hp = Math.max(0, boss.hp - amount);
    this.hud.showBoss(boss.hp / boss.maxHp);
    audio.play('bossHit');
    if (this.active('invisible')) this.player.until.invisible = this.now;
    if (boss.phase === 'evil' && boss.hp <= boss.maxHp * 0.25) {
      this.startTransform();
    } else if (boss.phase === 'giant' && boss.hp === 0) {
      this.defeatSuperBoss();
    }
  }

  defeatSuperBoss() {
    const boss = this.boss;
    boss.state = 'defeated';
    if (boss.marker) this.scene.remove(boss.marker);
    if (boss.wave) this.scene.remove(boss.wave.ring);
    audio.stopMusic();
    audio.play('explosion');
    this.shakeUntil = this.now + 1200;
    for (let i = 0; i < 8; i++) this.pop(this.bossCenter().add(new THREE.Vector3().randomDirection().multiplyScalar(3)), 0xd500f9, 3);
    this.scene.remove(boss.mesh);
    for (const shot of this.shots.filter((s) => !s.fromPlayer)) shot.life = 0;
    this.addBolts(BOSS_REWARD * 10);
    this.save.adventure.superBossBeaten = true;
    writeSave(this.save);
    this.hud.hideBoss();
    this.hud.message(t('adv.superBossBeaten'), t('adv.gotBolts', { count: BOSS_REWARD * 10 * (this.save.powerUps.includes('double') ? 2 : 1) }), 5000);
    setTimeout(() => {
      if (this.ended) return;
      audio.play('win');
      this.respawn();
    }, 5000);
  }


  // Freeze Ray (Z): every bad guy freezes inside an ice cube for 5 seconds; the boss only slows down.
  useFreezeRay(enemies) {
    if (this.now < (this.freezeUntil ?? 0) || this.now < (this.freezeReadyAt ?? 0)) return;
    this.freezeUntil = this.now + 5000;
    audio.play('freeze');
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.ice) continue;
      enemy.ice = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 1.6),
        new THREE.MeshBasicMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      this.scene.add(enemy.ice);
    }
  }

  get frozen() {
    return this.now < (this.freezeUntil ?? 0);
  }

  // When the freeze ends (or a frozen bad guy is beaten), the ice goes away.
  meltIce(enemies) {
    for (const enemy of enemies) {
      if (enemy.ice && (!this.frozen || !enemy.alive)) {
        this.scene.remove(enemy.ice);
        enemy.ice = null;
      }
    }
    if (this.freezeUntil && !this.frozen) {
      this.freezeUntil = 0;
      this.freezeReadyAt = this.now + 30000;
    }
  }

  // ---------- Effects and camera ----------

  pop(position, color, size = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5 * size, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true }));
    mesh.position.copy(position);
    this.addEffect(mesh, 0.35, (m, k) => {
      m.scale.setScalar(1 + k * 2);
      m.material.opacity = 1 - k;
    });
  }

  // remove: take the mesh away at the end (false for things that stay, like a chest lid).
  addEffect(mesh, seconds, update, remove = true) {
    if (remove) this.scene.add(mesh);
    this.effects.push({ mesh, seconds, age: 0, update, remove });
  }

  updateEffects(dt) {
    for (const effect of this.effects) {
      effect.age += dt;
      effect.update(effect.mesh, Math.min(1, effect.age / effect.seconds));
      if (effect.age >= effect.seconds && effect.remove) this.scene.remove(effect.mesh);
    }
    this.effects = this.effects.filter((e) => e.age < e.seconds);
  }

  updateCamera(dt) {
    const p = this.player;
    const wanted = p.pos.clone().addScaledVector(p.forward, -7).addScaledVector(UP, 3.5);
    wanted.y = Math.max(wanted.y, this.groundAt(wanted.x, wanted.z) + 1);
    this.camera.position.lerp(wanted, 1 - Math.exp(-dt * 5));
    const lookAt = p.pos.clone().addScaledVector(UP, 1.2).addScaledVector(p.forward, 2);
    if (this.now < (this.shakeUntil ?? 0)) lookAt.add(new THREE.Vector3().randomDirection().multiplyScalar(0.3));
    this.camera.lookAt(lookAt);
  }

  // ---------- Leaving ----------

  exit() {
    if (this.ended) return;
    this.destroy();
    this.onExit();
  }

  destroy() {
    this.ended = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    this.hud.destroy();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
