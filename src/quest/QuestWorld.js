import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { BAD_GUY_REWARD, BOSS_REWARD } from '../difficulty.js';
import { writeSave } from '../save.js';
import { Hud } from '../world2/hud.js';
import { AdventureWorld } from '../adventure/AdventureWorld.js';
import * as models from './models.js';
import { QuestMenu } from './menu.js';
import { CELL, WATER_Y, FOOD_PER_BABY, TEAM_SIZE, FOOD_COLORS, RAINBOW_EGG_CHANCE, SHOP, ISLANDS, CAGED_BABIES } from './map.js';

// CUBE ISLANDS (Ethan's "Pokémon Quest" world, layout in map.js). It extends AdventureWorld to reuse the hero:
// running, jumping, attacks, powers, getting hurt and the camera. What's new here: block islands you travel
// between on launch pads, food, the cooking pot, baby helpers that level up, the team tent, the food shop,
// each island's bad guys, and the Block Dragon.
//
// save.quest = { food: { color: count }, babies: [{ animal, color, xp, team }], dragonBeaten }

const UP = new THREE.Vector3(0, 1, 0);
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function orient(object, forward) {
  object.rotation.set(0, Math.atan2(forward.x, forward.z), 0);
}

const FOOD_ICONS = { red: '🍓', blue: '🍄', yellow: '🌽', green: '🥝', pink: '🍬', purple: '🍆' };
const BABY_ICONS = { red: '🔥', blue: '❄️', yellow: '⚡', green: '🌿', pink: '💗', purple: '👻', rainbow: '🌈' };
const ANIMAL_ICONS = { cat: '🐱', capybara: '🦫' };
const PAD_COLORS = { base: 0xffffff, beach: 0xffd54f, forest: 0x4fc3f7, candy: 0xff80ab, dragon: 0xff5252 };
const COOK_MS = 3000;
const SEE = 12;
const BABY_RANGE = 13;
const GHOST_RANGE = 18;
const SLOW_MS = 2500;
const TRAP_MS = 2500;
const DRAGON_WAKE_DISTANCE = 18;
const DRAGON_HIT_RADIUS = 3.4;
const JUMP_SPEED = 10.5;

// What each baby color does (Ethan's design: the color is the power). Pink heals you instead of shooting.
// Rainbow does everything: it heals too, and every shot is the next power.
const BABY_POWERS = {
  red: { waitMs: 1100, damage: 2, power: 'fire' },
  blue: { waitMs: 1300, damage: 1, power: 'ice' },
  yellow: { waitMs: 650, damage: 1, power: 'lightning' },
  green: { waitMs: 1400, damage: 1, power: 'vine' },
  purple: { waitMs: 1000, damage: 1.5, power: 'ghost' },
  pink: { healMs: 9000 },
  rainbow: { waitMs: 700, damage: 2, power: 'rainbow', healMs: 12000 },
};
const RAINBOW_POWERS = ['fire', 'ice', 'lightning', 'vine', 'ghost'];
// How each power's shot looks: [color, size, speed, sound]
const SHOT_LOOKS = {
  fire: [0xff6d00, 0.25, 16, 'fireBreath'],
  ice: [0x80d8ff, 0.3, 16, 'freeze'],
  lightning: [0xfff176, 0.08, 26, 'laser'],
  vine: [0x2e7d32, 0.12, 16, 'tongue'],
  ghost: [0xe1bee7, 0.3, 13, 'moon'],
};

// The bad guys. height: where their middle is. shoots: [ms between shots, color, size].
// sideways: walks like a crab. hops: bounces like a gummy bear. flies: how high it flies (drops fireballs).
const KINDS = {
  robot: { make: models.makeCubeRobot, hp: 2, speed: 2.6, height: 1.1, shoots: [2200, 0xff1744, 0.2] },
  crab: { make: models.makeCrab, hp: 2, speed: 3.6, height: 0.6, sideways: true },
  snowman: { make: models.makeSnowman, hp: 3, speed: 1.2, height: 1.4, shoots: [2400, 0xffffff, 0.3] },
  lizard: { make: models.makeLizard, hp: 1, speed: 4.8, height: 0.5 },
  gummy: { make: models.makeGummyBear, hp: 2, speed: 3, height: 1, hops: true },
  flyer: { make: models.makeMiniDragon, hp: 2, speed: 3.5, height: 0, flies: 6 },
};

// Total xp a baby needs for each level: level 2 at 4, level 3 at 12, level 4 at 24...
function levelOf(xp) {
  let level = 1;
  while (xp >= 2 * level * (level + 1)) level++;
  return level;
}

// Ground height of a block on an island: hills of whole blocks (1, 2 or 3 high), flat near the edge and special spots.
function blockHeight(island, cx, cz) {
  const dx = cx - island.x;
  const dz = cz - island.z;
  if (!island.hills || Math.hypot(dx, dz) > island.radius - 4) return 1;
  if ([island.start, ...island.pads].some(([fx, fz]) => Math.hypot(dx - fx, dz - fz) < 4)) return 1;
  if (island.nest && Math.hypot(dx - island.nest[0], dz - island.nest[1]) < 11) return 1;
  const wave = Math.sin(dx * 0.32 + island.seed) + Math.cos(dz * 0.27 + island.seed * 2);
  return 1 + Math.max(0, Math.round(wave * island.hills * 0.6));
}

function islandAt(x, z) {
  const cx = (Math.floor(x / CELL) + 0.5) * CELL;
  const cz = (Math.floor(z / CELL) + 0.5) * CELL;
  for (const [id, island] of Object.entries(ISLANDS)) {
    if (Math.hypot(cx - island.x, cz - island.z) < island.radius) return { id, island, cx, cz };
  }
  return null;
}

export class QuestWorld extends AdventureWorld {
  constructor(options) {
    const quest = (options.save.quest ??= { food: {}, babies: [], dragonBeaten: false });
    // Saves from before levels, the team tent and the new foods
    for (const color of FOOD_COLORS) quest.food[color] ??= 0;
    const hadTeams = quest.babies.some((b) => b.team !== undefined);
    quest.babies.forEach((baby, i) => {
      baby.xp ??= 0;
      if (!hadTeams) baby.team = i < TEAM_SIZE;
    });
    super(options);
  }

  get quest() {
    return this.save.quest;
  }

  // ---------- The islands ----------

  build() {
    this.scene.background = new THREE.Color(0x8fd8ff);
    this.scene.fog.color.setHex(0x8fd8ff);
    this.badGuys = [];
    this.guards = this.badGuys; // the Freeze Ray (in AdventureWorld) freezes these
    this.foods = [];
    this.babies = [];
    this.pads = [];

    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x29b6f6 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = WATER_Y;
    this.scene.add(sea);

    for (const [id, island] of Object.entries(ISLANDS)) {
      this.createBlocks(island);
      island.trees.forEach(([dx, dz], i) => {
        const x = island.x + dx;
        const z = island.z + dz;
        const y = this.groundAt(x, z);
        const tree = island.lollipops ? models.makeLollipop(i) : models.makeTree(i + island.seed);
        tree.position.set(x, y, z);
        this.scene.add(tree);
        this.addSolid(x - 0.4, x + 0.4, y, y + 3, z - 0.4, z + 0.4);
      });
      for (const [dx, dz, target] of island.pads) {
        const x = island.x + dx;
        const z = island.z + dz;
        const { group, cube } = models.makePad(PAD_COLORS[target]);
        group.position.set(x, this.groundAt(x, z), z);
        this.scene.add(group);
        this.addLabel(target === 'base' ? t('quest.back') : t(`quest.${target}`), x, z);
        this.pads.push({ from: id, target, x, z, cube });
      }
    }
    this.createPot();
    this.createTentAndShop();
    this.createCages();
  }

  addLabel(text, x, z, height = 3.6) {
    const label = models.makeLabel(text);
    label.position.set(x, this.groundAt(x, z) + height, z);
    this.scene.add(label);
  }

  // One box per ground block, all drawn together (an InstancedMesh) so it's fast.
  createBlocks(island) {
    const cells = [];
    for (let cx = island.x - island.radius; cx <= island.x + island.radius; cx += CELL) {
      for (let cz = island.z - island.radius; cz <= island.z + island.radius; cz += CELL) {
        const x = (Math.floor(cx / CELL) + 0.5) * CELL;
        const z = (Math.floor(cz / CELL) + 0.5) * CELL;
        const distance = Math.hypot(x - island.x, z - island.z);
        if (distance < island.radius) cells.push({ x, z, top: blockHeight(island, x, z), sand: distance > island.radius - 4 });
      }
    }
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 1, CELL), new THREE.MeshStandardMaterial({ flatShading: true }), cells.length);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    cells.forEach(({ x, z, top, sand }, i) => {
      const bottom = -3;
      matrix.makeScale(1, top - bottom, 1).setPosition(x, (top + bottom) / 2, z);
      mesh.setMatrixAt(i, matrix);
      // A little checkerboard, like Pokémon Quest's blocks
      color.setHex(sand ? island.sand ?? 0xffe082 : island.ground ?? 0x7cb342).offsetHSL(0, 0, ((x + z) / CELL) % 2 === 0 ? 0.03 : -0.02);
      mesh.setColorAt(i, color);
    });
    this.scene.add(mesh);
  }

  groundAt(x, z) {
    const found = islandAt(x, z);
    return found ? blockHeight(found.island, found.cx, found.cz) : -4;
  }

  zoneAt(x, z) {
    return islandAt(x, z)?.id ?? this.island;
  }

  zoneName(zone) {
    return t(`quest.${zone}`);
  }

  keepInside() {} // the sea is all around: fall in and you swim back (see updateWorld)

  onLava() {
    return false;
  }

  get spawn() {
    const base = ISLANDS.base;
    return { x: base.x + base.start[0], z: base.z + base.start[1], facing: base.facing };
  }

  begin() {
    audio.playMusic('menu');
    this.island = 'base';
    this.zone = 'base';
    this.refreshBabies();
    this.hud.message(t('quest.title'), t('quest.intro'), 4500);
  }

  createHud() {
    const attack = t(`game.attack.${this.character.attack}`);
    this.hud = new Hud(this.container, {
      title: t('quest.title'),
      difficulty: t(`difficulty.${this.save.difficulty}`),
      hint: this.character.doubleJump ? `${attack}   ${t('game.jumpTwice')}` : attack,
      controls: t('game.controls3d'),
      menu: `${t('game.sound')}   ${t('game.menu')}`,
      maxHearts: this.settings.hearts,
      crystals: 0,
      bossName: t('quest.dragonName'),
    });
    if (this.save.touch) this.hud.hideKeyboardHints();
    this.hud.setHearts(this.player.hearts);
    this.hud.setBolts(this.save.bolts);
    this.updateItems();
  }

  updateItems() {
    const food = FOOD_COLORS.map((color) => `${FOOD_ICONS[color]}${this.quest.food[color]}`).join(' ');
    this.hud.setItems(`${food}   🐣${this.quest.babies.length}`);
  }

  // ---------- Travelling: launch pads ----------

  goTo(id) {
    this.clearIsland();
    this.island = id;
    const island = ISLANDS[id];
    const p = this.player;
    p.pos.set(island.x + island.start[0], 0, island.z + island.start[1]);
    p.pos.y = this.groundAt(p.pos.x, p.pos.z);
    p.vel.set(0, 0, 0);
    p.forward.set(island.facing[0], 0, island.facing[1]);
    this.checkpoint = { x: p.pos.x, z: p.pos.z };
    this.padReadyAt = this.now + 1000;
    this.camera.position.copy(p.pos).addScaledVector(p.forward, -7).addScaledVector(UP, 3.5);
    audio.play('blastOff');

    // Every visit is a new mission: the food and bad guys come back (and so does the dragon, for a rematch)
    for (const [dx, dz, color] of island.food) this.addFood(island.x + dx, island.z + dz, color);
    for (const [dx, dz, kind] of island.badGuys) this.addBadGuy(island.x + dx, island.z + dz, kind);
    if (id === 'dragon') this.createDragon();
    for (const baby of this.team) baby.pos.copy(p.pos);
  }

  clearIsland() {
    for (const food of this.foods) this.scene.remove(food.mesh);
    this.foods = [];
    for (const bad of this.badGuys) this.removeBadGuy(bad);
    this.badGuys.length = 0; // (the same list as this.guards)
    if (this.egg) this.scene.remove(this.egg.mesh);
    this.egg = null;
    if (this.dragon) {
      this.scene.remove(this.dragon.mesh, this.dragon.zzz);
      if (this.dragon.marker) this.scene.remove(this.dragon.marker);
      if (this.dragon.state !== 'sleeping') audio.playMusic('menu');
      this.dragon = null;
      this.hud.hideBoss();
    }
    for (const shot of this.shots) shot.life = 0;
  }

  updatePads() {
    const p = this.player;
    for (const pad of this.pads) {
      pad.cube.rotation.y += 0.03;
      pad.cube.position.y = 2.2 + Math.sin(this.now / 300) * 0.2;
      if (pad.from !== this.island || this.now < (this.padReadyAt ?? 0) || !p.onGround) continue;
      if (Math.hypot(p.pos.x - pad.x, p.pos.z - pad.z) < 1.5) {
        this.goTo(pad.target);
        return;
      }
    }
  }

  // Fell in the sea: SPLASH, lose a heart, and swim back to where you arrived.
  splash() {
    const p = this.player;
    audio.play('fall');
    this.pop(p.pos.clone().setY(WATER_Y), 0x81d4fa, 2);
    this.hud.message('', t('quest.splash'), 1200);
    p.safeUntil = 0;
    this.hurt(p.pos); // out of hearts: this sends you to base camp
    p.pos.set(this.checkpoint.x, this.groundAt(this.checkpoint.x, this.checkpoint.z), this.checkpoint.z);
    p.vel.set(0, 0, 0);
  }

  // Out of hearts: back to base camp.
  respawn() {
    this.goTo('base');
    this.player.safeUntil = this.now + this.settings.hurtSafeMs;
  }

  // ---------- Every frame ----------

  updateWorld(dt) {
    if (this.player.pos.y < WATER_Y - 0.5) this.splash();
    this.updatePads();
    this.updateFood();
    this.updateEgg();
    this.updateBadGuys(dt);
    this.updatePot();
    this.updateSpots();
    this.updateBabies(dt);
    this.updateDragon(dt);
  }

  targets() {
    const list = this.badGuys
      .filter((b) => b.alive)
      .map((b) => ({ point: this.badGuyCenter(b), radius: b.kind === 'flyer' ? 1.4 : 1.1, hit: (damage, shot) => this.hitBadGuy(b, damage, shot) }));
    const dragon = this.dragon;
    if (dragon && dragon.state !== 'sleeping' && dragon.state !== 'defeated') {
      list.push({ point: this.dragonCenter(), radius: DRAGON_HIT_RADIUS, hit: (damage, shot) => this.hitDragon(damage, shot) });
    }
    return list;
  }

  // ---------- Food ----------

  addFood(x, z, color) {
    const mesh = models.makeFood(color);
    const pos = vec(x, this.groundAt(x, z), z);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.foods.push({ color, mesh, pos, phase: Math.random() * 6 });
  }

  updateFood() {
    const body = this.body;
    for (const food of this.foods) {
      food.mesh.rotation.y += 0.04;
      food.mesh.position.y = food.pos.y + 0.2 + Math.sin(this.now / 300 + food.phase) * 0.15;
      if (food.taken || food.mesh.position.distanceTo(body) > 1.3) continue;
      food.taken = true;
      this.scene.remove(food.mesh);
      this.quest.food[food.color] += 1;
      writeSave(this.save);
      audio.play('bolt');
      this.pop(food.mesh.position, 0xffffff, 0.6);
      this.updateItems();
    }
    this.foods = this.foods.filter((f) => !f.taken);
  }

  // ---------- The cooking pot ----------

  createPot() {
    const base = ISLANDS.base;
    const x = base.x + base.pot[0];
    const z = base.z + base.pot[1];
    const y = this.groundAt(x, z);
    const { group, soup } = models.makePot();
    group.position.set(x, y, z);
    this.scene.add(group);
    this.addSolid(x - 1.3, x + 1.3, y, y + 2, z - 1.3, z + 1.3);
    this.pot = { x, z, y, soup, cooking: null };
  }

  updatePot() {
    const pot = this.pot;
    if (pot.cooking) {
      const k = (this.now - pot.cooking.startedAt) / COOK_MS;
      pot.soup.position.y = 1.82 + Math.sin(this.now / 80) * 0.05;
      if (this.now > (pot.nextBubbleAt ?? 0)) {
        pot.nextBubbleAt = this.now + 250;
        const bubble = vec(pot.x + (Math.random() - 0.5) * 1.6, pot.y + 2, pot.z + (Math.random() - 0.5) * 1.6);
        this.pop(bubble, models.BABY_COLORS[pot.cooking.color].body, 0.4);
      }
      if (k >= 1) this.finishCooking();
      return;
    }
    if (this.island !== 'base') return;
    const p = this.player;
    if (Math.hypot(p.pos.x - pot.x, p.pos.z - pot.z) > 3.2) return;
    const food = this.quest.food;
    const total = FOOD_COLORS.reduce((sum, color) => sum + food[color], 0);
    if (total < FOOD_PER_BABY) {
      if (this.now > (this.potMessageAt ?? 0)) {
        this.potMessageAt = this.now + 3000;
        audio.play('error');
        this.hud.message('', t('quest.needFood', { count: FOOD_PER_BABY }), 2000);
      }
      return;
    }
    // Use the food you have the most of first; that color decides the baby.
    const colors = [...FOOD_COLORS].sort((a, b) => food[b] - food[a]);
    let needed = FOOD_PER_BABY;
    for (const color of colors) {
      const used = Math.min(food[color], needed);
      food[color] -= used;
      needed -= used;
    }
    writeSave(this.save);
    this.updateItems();
    pot.cooking = { color: colors[0], startedAt: this.now };
    pot.soup.material.color.setHex(models.BABY_COLORS[colors[0]].body);
    audio.play('crystal');
    this.hud.message('', t('quest.cooking'), COOK_MS);
  }

  finishCooking() {
    const pot = this.pot;
    const baby = this.addBaby(Math.random() < 0.5 ? 'cat' : 'capybara', pot.cooking.color);
    pot.cooking = null;
    this.potMessageAt = this.now + 5000; // let the NEW BABY message stay
    pot.soup.material.color.setHex(0xfff3e0);
    this.pop(vec(pot.x, pot.y + 2.5, pot.z), 0xffffff, 2);
    this.hud.message(t('quest.newBaby'), `${this.babyName(baby)}${baby.team ? '' : `  ${t('quest.teamFull')}`}`, 3500);
  }

  // A new baby joins the team if there's room (or waits at base camp).
  addBaby(animal, color) {
    const baby = { animal, color, xp: 0, team: this.quest.babies.filter((b) => b.team).length < TEAM_SIZE };
    this.quest.babies.push(baby);
    writeSave(this.save);
    audio.play('key');
    this.refreshBabies();
    this.updateItems();
    return baby;
  }

  babyName(baby) {
    return t('quest.babyName', { color: t(`quest.color.${baby.color}`), animal: t(`quest.animal.${baby.animal}`) });
  }

  // ---------- The team tent and the food shop (at base camp) ----------

  createTentAndShop() {
    const base = ISLANDS.base;
    const place = ([dx, dz], mesh, label) => {
      const x = base.x + dx;
      const z = base.z + dz;
      mesh.position.set(x, this.groundAt(x, z), z);
      mesh.rotation.y = Math.atan2(base.start[0] - dx, base.start[1] - dz); // facing where you arrive
      this.scene.add(mesh);
      this.addLabel(label, x, z, 3.8);
      return { x, z, inside: false };
    };
    this.spots = {
      team: place(base.tent, models.makeTent(), t('quest.team')),
      shop: place(base.shop, models.makeShop(), t('quest.shop')),
    };
  }

  // Walk into the tent or up to the shop and its screen opens (once, until you walk away again).
  updateSpots() {
    if (this.island !== 'base') return;
    const p = this.player;
    for (const [id, spot] of Object.entries(this.spots)) {
      const inside = Math.hypot(p.pos.x - spot.x, p.pos.z - spot.z) < 2.8;
      if (inside && !spot.inside) (id === 'team' ? this.openTeam() : this.openShop());
      spot.inside = inside;
    }
  }

  openMenu(options, onPick) {
    this.paused = true;
    this.player.vel.set(0, this.player.vel.y, 0);
    audio.play('click');
    this.menu = new QuestMenu(this.container, options);
    this.onMenuPick = onPick;
  }

  closeMenu() {
    this.menu.destroy();
    this.menu = null;
    this.paused = false;
    audio.play('click');
  }

  // While a menu is open: arrows choose, SPACE/ENTER picks, ESC or X closes (B on a game controller).
  updatePaused() {
    if (!this.menu) return;
    if (this.pressed('ArrowUp', 'KeyW')) this.menu.move(-1);
    if (this.pressed('ArrowDown', 'KeyS')) this.menu.move(1);
    if (this.pressed('Space', 'Enter')) {
      this.onMenuPick(this.menu.index);
      this.menu.render();
    }
    if (this.pressed('Escape', 'KeyX')) this.closeMenu();
  }

  openTeam() {
    const babies = this.quest.babies;
    this.openMenu(
      {
        title: `⛺ ${t('quest.team')}`,
        sub: () => (babies.length ? t('quest.teamSub', { count: babies.filter((b) => b.team).length, max: TEAM_SIZE }) : t('quest.noBabies')),
        help: t('quest.teamHelp'),
        rows: () =>
          babies.map((baby) => ({
            text: `${BABY_ICONS[baby.color]} ${ANIMAL_ICONS[baby.animal]} ${this.babyName(baby)}`,
            note: `${t('quest.level', { level: levelOf(baby.xp) })}   ${baby.team ? '✅' : '⬜'}`,
          })),
      },
      (index) => {
        const baby = babies[index];
        if (!baby) return;
        if (!baby.team && babies.filter((b) => b.team).length >= TEAM_SIZE) {
          audio.play('error');
          this.hud.message('', t('quest.teamPickFull'), 2000);
          return;
        }
        baby.team = !baby.team;
        audio.play('click');
        writeSave(this.save);
        this.refreshBabies();
      },
    );
  }

  openShop() {
    const food = this.quest.food;
    this.openMenu(
      {
        title: `🏪 ${t('quest.shop')}`,
        sub: () => `⚡ ${this.save.bolts}     ${SHOP.map(([color]) => `${FOOD_ICONS[color]} ${food[color]}`).join('   ')}`,
        help: t('quest.shopHelp'),
        rows: () => SHOP.map(([color, price]) => ({ text: `${FOOD_ICONS[color]} ${t(`quest.food.${color}`)}`, note: `⚡ ${price}` })),
      },
      (index) => {
        const [color, price] = SHOP[index];
        if (this.save.bolts < price) {
          audio.play('error');
          this.hud.message('', t('menu.needBolts', { count: price - this.save.bolts }), 2000);
          return;
        }
        this.save.bolts -= price;
        food[color] += 1;
        writeSave(this.save);
        audio.play('buy');
        this.hud.setBolts(this.save.bolts);
        this.updateItems();
      },
    );
  }

  // ---------- Baby helpers ----------

  // Team babies follow you; the others hop around the pot at base camp.
  refreshBabies() {
    for (const baby of this.babies) this.scene.remove(baby.mesh);
    let slot = 0;
    let waiting = 0;
    const waitingCount = this.quest.babies.filter((b) => !b.team).length;
    this.babies = this.quest.babies.map((data) => {
      const { group, legs } = models.makeBaby(data.animal, data.color);
      this.scene.add(group);
      const angle = (waiting / Math.max(1, waitingCount)) * Math.PI * 2;
      const home = vec(this.pot.x + Math.cos(angle) * 4.5, 0, this.pot.z + Math.sin(angle) * 4.5);
      const baby = { data, mesh: group, legs, inTeam: data.team, home, nextShotAt: 0, nextHealAt: this.now + 3000, shots: 0 };
      if (data.team) baby.slot = slot++;
      else baby.slot = waiting++;
      baby.pos = data.team ? this.player.pos.clone() : home.clone();
      return baby;
    });
  }

  get team() {
    return this.babies.filter((b) => b.inTeam);
  }

  updateBabies(dt) {
    const p = this.player;
    const side = vec(-p.forward.z, 0, p.forward.x);
    const targets = this.targets();
    for (const baby of this.babies) {
      let moving = false;
      if (baby.inTeam) {
        // Follow behind you, side by side
        const wanted = p.pos.clone().addScaledVector(p.forward, -2).addScaledVector(side, (baby.slot - 1) * 1.4);
        const to = vec(wanted.x - baby.pos.x, 0, wanted.z - baby.pos.z);
        if (to.length() > 20) baby.pos.copy(wanted);
        else if (to.length() > 0.4) {
          baby.pos.addScaledVector(to.normalize(), Math.min(to.length(), 8.5 * dt));
          orient(baby.mesh, to);
          moving = true;
        }
      } else {
        baby.pos.copy(baby.home);
      }
      const ground = Math.max(this.groundAt(baby.pos.x, baby.pos.z), WATER_Y);
      const hop = moving || !baby.inTeam ? Math.abs(Math.sin(this.now / 140 + baby.slot)) * 0.35 : 0;
      baby.pos.y = ground;
      baby.mesh.position.copy(baby.pos).addScaledVector(UP, hop);
      baby.legs.forEach((leg, i) => (leg.rotation.x = moving ? Math.sin(this.now / 60 + i * Math.PI) * 0.6 : 0));
      if (!baby.inTeam) continue;
      this.babyHeal(baby);
      this.babyAttack(baby, targets);
    }
  }

  // Pink (and rainbow) babies give you a heart back now and then. Higher levels heal more often.
  babyHeal(baby) {
    const { healMs } = BABY_POWERS[baby.data.color];
    const p = this.player;
    if (!healMs || this.now < baby.nextHealAt || p.hearts >= this.settings.hearts) return;
    baby.nextHealAt = this.now + Math.max(4000, healMs - (levelOf(baby.data.xp) - 1) * 500);
    p.hearts += 1;
    this.hud.setHearts(p.hearts);
    audio.play('shield');
    this.pop(this.body, 0xff4081, 1.2);
  }

  // Each baby shoots at the nearest bad guy by itself. Its color is its power; higher levels hit harder.
  babyAttack(baby, targets) {
    const { waitMs, damage, power } = BABY_POWERS[baby.data.color];
    if (!power || this.now < baby.nextShotAt) return;
    const kind = power === 'rainbow' ? RAINBOW_POWERS[baby.shots % RAINBOW_POWERS.length] : power;
    const from = baby.pos.clone().addScaledVector(UP, 0.9);
    const range = kind === 'ghost' ? GHOST_RANGE : BABY_RANGE;
    const target = targets
      .filter((x) => x.point.distanceTo(from) < range)
      .sort((a, b) => a.point.distanceTo(from) - b.point.distanceTo(from))[0];
    if (!target) return;
    baby.nextShotAt = this.now + waitMs;
    baby.shots += 1;
    const [color, size, speed, sound] = SHOT_LOOKS[kind];
    const geometry =
      kind === 'fire' || kind === 'ghost'
        ? new THREE.SphereGeometry(size, 8, 6)
        : kind === 'ice'
          ? new THREE.BoxGeometry(size, size, size)
          : new THREE.BoxGeometry(size, size, kind === 'vine' ? 0.7 : 0.9);
    const material = new THREE.MeshBasicMaterial({ color, transparent: kind === 'ghost', opacity: kind === 'ghost' ? 0.6 : 1 });
    const vel = target.point.clone().sub(from).setLength(speed);
    orient(baby.mesh, vec(vel.x, 0, vel.z));
    audio.play(sound);
    this.addShot({
      mesh: new THREE.Mesh(geometry, material),
      pos: from,
      vel,
      life: kind === 'ghost' ? 2 : 1.4,
      damage: damage * (1 + 0.2 * (levelOf(baby.data.xp) - 1)),
      fromPlayer: true,
      homing: true,
      power: kind,
      ghost: kind === 'ghost', // flies through hills and trees
    });
  }

  // Every baby in the team gets xp when a bad guy is beaten.
  giveXp(amount) {
    const leveledUp = this.team.filter((baby) => {
      const before = levelOf(baby.data.xp);
      baby.data.xp += amount;
      return levelOf(baby.data.xp) > before;
    });
    writeSave(this.save);
    if (!leveledUp.length) return;
    audio.play('crystal');
    for (const baby of leveledUp) this.pop(baby.pos.clone().addScaledVector(UP, 1), 0xffd23f, 1.2);
    const baby = leveledUp[0].data;
    this.hud.message(t('quest.levelUp'), t('quest.levelUpSub', { name: this.babyName(baby), level: levelOf(baby.xp) }), 2500);
  }

  // ---------- Bad guys ----------

  addBadGuy(x, z, kind) {
    const info = KINDS[kind];
    const { group, legs } = info.make(this.badGuys.length);
    this.scene.add(group);
    const home = vec(x, this.groundAt(x, z), z);
    this.badGuys.push({ kind, info, mesh: group, legs, home, pos: home.clone(), alive: true, hp: info.hp, angle: Math.random() * 6, phase: Math.random() * 6, nextShotAt: 0 });
  }

  removeBadGuy(bad) {
    this.scene.remove(bad.mesh);
    if (bad.ice) this.scene.remove(bad.ice);
    if (bad.vines) this.scene.remove(bad.vines);
  }

  badGuyCenter(bad) {
    return bad.pos.clone().addScaledVector(UP, bad.info.height);
  }

  updateBadGuys(dt) {
    const p = this.player;
    const body = this.body;
    for (const bad of this.badGuys) {
      if (!bad.alive) continue;
      if (bad.ice) {
        bad.ice.position.copy(this.badGuyCenter(bad));
        continue;
      }
      const trapped = this.now < (bad.trappedUntil ?? 0);
      if (bad.vines) {
        bad.vines.position.copy(this.badGuyCenter(bad));
        if (!trapped) {
          this.scene.remove(bad.vines);
          bad.vines = null;
        }
      }
      const info = bad.info;
      const slow = this.now < (bad.slowUntil ?? 0) ? 0.35 : 1;
      const toPlayer = body.clone().sub(this.badGuyCenter(bad));
      const flat = vec(toPlayer.x, 0, toPlayer.z);
      const sees = flat.length() < (info.flies ? 14 : SEE) && !this.active('invisible');

      // Move: chase you when it sees you, or walk (fly) around its home
      let step = vec(0, 0, 0);
      if (!trapped) {
        if (sees && flat.length() > (info.flies ? 0.5 : 1.5)) {
          step = flat.clone().setLength(Math.min(flat.length(), info.speed * slow * dt));
        } else if (!sees) {
          bad.angle += dt * 0.7 * slow;
          const radius = info.flies ? 5 : 3;
          const wanted = bad.home.clone().add(vec(Math.cos(bad.angle) * radius, 0, Math.sin(bad.angle) * radius));
          step = vec(wanted.x - bad.pos.x, 0, wanted.z - bad.pos.z);
          if (step.length() > 2 * dt) step.setLength(2 * dt);
        }
      }
      const next = bad.pos.clone().add(step);
      if (info.flies || this.groundAt(next.x, next.z) > 0) bad.pos.copy(next); // only flyers go over the sea
      const ground = Math.max(this.groundAt(bad.pos.x, bad.pos.z), 1);
      if (info.flies) bad.pos.y = ground + info.flies + Math.sin(this.now / 500 + bad.phase) * 0.4;
      else if (info.hops && !trapped) bad.pos.y = ground + Math.abs(Math.sin(this.now / 260 + bad.phase)) * 1.3;
      else bad.pos.y = ground;
      bad.mesh.position.copy(bad.pos);
      const facing = sees ? flat : step.lengthSq() > 0 ? step : flat;
      if (facing.lengthSq() > 0) orient(bad.mesh, facing);
      if (info.sideways) bad.mesh.rotation.y += Math.PI / 2; // crabs walk sideways!
      const moving = step.lengthSq() > 0;
      bad.legs.forEach((leg, i) => {
        if (info.flies) leg.rotation.z = Math.sin(this.now / 90) * 0.6 * (i ? -1 : 1);
        else leg.rotation.x = moving ? Math.sin(this.now / 90 + i * Math.PI) * 0.5 : 0;
      });

      if (info.flies) {
        // Flies over you and drops fireballs
        if (sees && flat.length() < 3 && this.now > bad.nextShotAt) {
          bad.nextShotAt = this.now + 2000 * this.settings.enemyShotSlowdown;
          this.enemyShot(bad.pos.clone(), vec(p.pos.x, p.pos.y, p.pos.z), 7, 0xff6d00, 0.35);
        }
        continue;
      }

      // Touching it: stomp it, burn it, or get hurt
      if (toPlayer.length() < 1.3) {
        if (p.vel.y < 0 && p.pos.y > bad.pos.y + 0.7) {
          this.defeatBadGuy(bad);
          p.vel.y = JUMP_SPEED * 0.8;
          audio.play('stomp');
        } else if (this.character.fireAura || this.active('mecha')) {
          this.defeatBadGuy(bad);
        } else {
          this.hurt(bad.pos);
        }
        continue;
      }
      if (!info.shoots || !sees || trapped) continue;
      const [everyMs, color, size] = info.shoots;
      if (!bad.nextShotAt) bad.nextShotAt = this.now + this.settings.enemyFirstShotMs;
      if (this.now < bad.nextShotAt) continue;
      bad.nextShotAt = this.now + (everyMs / slow) * this.settings.enemyShotSlowdown;
      this.enemyShot(this.badGuyCenter(bad), body, this.settings.enemyShotSpeed / 30, color, size);
    }
  }

  hitBadGuy(bad, damage, shot) {
    if (!bad.alive) return;
    if (shot?.power === 'ice') bad.slowUntil = this.now + SLOW_MS;
    if (shot?.power === 'vine') {
      // Vines wrap around it: it can't move
      bad.trappedUntil = this.now + TRAP_MS;
      if (!bad.vines) {
        bad.vines = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.12, 6, 16), new THREE.MeshBasicMaterial({ color: 0x2e7d32 }));
        bad.vines.rotation.x = Math.PI / 2;
        this.scene.add(bad.vines);
      }
    }
    bad.hp -= damage;
    if (bad.hp <= 0) this.defeatBadGuy(bad);
    else this.pop(this.badGuyCenter(bad), 0xffffff, 0.5);
  }

  // Beaten bad guys drop food (one of the island's colors) and bolts, and the team gets xp.
  defeatBadGuy(bad) {
    if (!bad.alive) return;
    bad.alive = false;
    this.removeBadGuy(bad);
    audio.play(bad.ice ? 'shatter' : 'pop');
    this.giveXp(1);
    this.addBolts(bad.ice ? BAD_GUY_REWARD * 2 : BAD_GUY_REWARD);
    this.pop(this.badGuyCenter(bad), 0xffffff);
    const colors = ISLANDS[this.island].foodColors;
    if (colors.length) this.addFood(bad.pos.x, bad.pos.z, colors[Math.floor(Math.random() * colors.length)]);
    if (this.active('invisible')) this.player.until.invisible = this.now;
  }

  // ---------- The cages and the Block Dragon ----------

  createCages() {
    const island = ISLANDS.dragon;
    this.cages = island.cages.map(([dx, dz], i) => {
      const x = island.x + dx;
      const z = island.z + dz;
      const y = this.groundAt(x, z);
      const { group, bars } = models.makeCage();
      group.position.set(x, y, z);
      this.scene.add(group);
      const data = CAGED_BABIES[i];
      const baby = models.makeBaby(data.animal, data.color).group;
      baby.position.set(x, y + 0.2, z);
      baby.rotation.y = Math.PI / 2 - Math.atan2(dz - island.nest[1], dx - island.nest[0]); // looking sad at the dragon
      this.scene.add(baby);
      if (this.quest.dragonBeaten) {
        bars.visible = false;
        baby.visible = false;
      }
      return { bars, baby };
    });
  }

  createDragon() {
    const island = ISLANDS.dragon;
    const { group, eyes, wings, jaw } = models.makeDragon();
    const pos = vec(island.x + island.nest[0], 1, island.z + island.nest[1]);
    group.position.copy(pos);
    this.scene.add(group);
    const zzz = models.makeLabel('Z z z', '#b3e5fc');
    zzz.scale.set(4, 1, 1);
    this.scene.add(zzz);
    this.dragon = {
      mesh: group,
      eyes,
      wings,
      jaw,
      zzz,
      pos,
      home: pos.clone(),
      state: 'sleeping',
      rematch: this.quest.dragonBeaten,
      hp: this.settings.bossHp * 4,
      maxHp: this.settings.bossHp * 4,
      nextActionAt: 0,
    };
    for (const eye of eyes) eye.scale.y = 0.15; // asleep
  }

  dragonCenter() {
    return this.dragon.pos.clone().addScaledVector(UP, 2.6);
  }

  updateDragon() {
    const dragon = this.dragon;
    if (!dragon || dragon.state === 'defeated') return;
    const p = this.player;
    const toPlayer = vec(p.pos.x - dragon.pos.x, 0, p.pos.z - dragon.pos.z);

    if (dragon.state === 'sleeping') {
      dragon.mesh.scale.y = 1 + Math.sin(this.now / 600) * 0.03; // breathing
      dragon.zzz.position.copy(dragon.pos).add(vec(0, 7.5 + Math.sin(this.now / 400) * 0.3, 3));
      if (toPlayer.length() < DRAGON_WAKE_DISTANCE) this.wakeDragon();
      return;
    }
    if (dragon.state === 'waking') {
      const k = Math.min(1, (this.now - dragon.wokeAt) / 1500);
      for (const eye of dragon.eyes) eye.scale.y = 0.15 + 0.85 * k;
      dragon.wings.forEach((wing, i) => (wing.rotation.z = Math.sin(this.now / 80) * 0.6 * (i ? -1 : 1)));
      if (k === 1) {
        dragon.state = 'fighting';
        dragon.nextActionAt = this.now + 1000;
      }
      orient(dragon.mesh, toPlayer);
      return;
    }

    const slow = this.now < (dragon.slowUntil ?? 0) || this.frozen;
    dragon.wings.forEach((wing, i) => (wing.rotation.z = Math.sin(this.now / (dragon.jump ? 70 : 300)) * (dragon.jump ? 0.8 : 0.15) * (i ? -1 : 1)));
    if (dragon.jump) {
      // Flies up and stomps down where the red ring is
      const k = Math.min(1, (this.now - dragon.jump.startedAt) / dragon.jump.duration);
      dragon.pos.copy(dragon.jump.from).lerp(dragon.jump.to, k).addScaledVector(UP, Math.sin(Math.PI * k) * 9);
      if (k === 1) this.dragonLands();
    } else if (dragon.charge) {
      const k = Math.min(1, (this.now - dragon.charge.startedAt) / 1000);
      dragon.pos.copy(dragon.charge.from).lerp(dragon.charge.to, k);
      if (k === 1) dragon.charge = null;
    } else if (this.now > dragon.nextActionAt && !this.active('invisible')) {
      dragon.nextActionAt = this.now + this.settings.bossActionMs * (slow ? 2 : 1.3);
      this.dragonAction(toPlayer);
    }
    dragon.mesh.position.copy(dragon.pos);
    if (toPlayer.lengthSq() > 0.01) orient(dragon.mesh, toPlayer);
    dragon.jaw.position.y = this.now < (dragon.mouthOpenUntil ?? 0) ? -0.95 : -0.65;

    // Touching the dragon hurts (unless you're on fire or in the Mecha suit)
    if (this.body.distanceTo(this.dragonCenter()) < DRAGON_HIT_RADIUS + 0.5) {
      if (this.character.fireAura || this.active('mecha')) {
        if (this.now > (dragon.burnReadyAt ?? 0)) {
          dragon.burnReadyAt = this.now + 300;
          this.hitDragon(1);
        }
      } else {
        this.hurt(dragon.pos);
      }
    }
  }

  wakeDragon() {
    const dragon = this.dragon;
    dragon.state = 'waking';
    dragon.wokeAt = this.now;
    dragon.mesh.scale.y = 1;
    this.scene.remove(dragon.zzz);
    audio.play('bossRoar');
    audio.playMusic('boss');
    this.shakeUntil = this.now + 800;
    this.hud.setBossName(t('quest.dragonName'));
    this.hud.showBoss(1);
    this.hud.message(t('quest.dragonName'), t(dragon.rematch ? 'quest.dragonBack' : 'quest.dragonWakes'), 2500);
  }

  // Picks an attack: fire breath, a big stomp, or a charge. He never leaves his island.
  dragonAction(toPlayer) {
    const dragon = this.dragon;
    const island = ISLANDS.dragon;
    const target = vec(this.player.pos.x, 1, this.player.pos.z);
    const fromHome = vec(target.x - island.x, 0, target.z - island.z);
    if (fromHome.length() > island.radius - 7) fromHome.setLength(island.radius - 7);
    target.set(island.x + fromHome.x, 1, island.z + fromHome.z);
    const action = toPlayer.length() > 18 ? 'stomp' : ['fire', 'stomp', 'charge'][Math.floor(Math.random() * 3)];

    if (action === 'fire') {
      audio.play('fireBreath');
      dragon.mouthOpenUntil = this.now + 1300;
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (!this.dragon || this.dragon.state !== 'fighting' || this.ended) return;
          const forward = vec(this.player.pos.x - dragon.pos.x, 0, this.player.pos.z - dragon.pos.z).normalize();
          const mouth = dragon.pos.clone().addScaledVector(UP, 4.6).addScaledVector(forward, 5);
          this.enemyShot(mouth, vec(this.player.pos.x, this.player.pos.y + 0.6, this.player.pos.z), (this.settings.enemyShotSpeed / 30) * 1.2, 0xff6d00, 0.45);
        }, i * 150);
      }
    } else if (action === 'stomp') {
      dragon.marker = new THREE.Mesh(new THREE.TorusGeometry(4, 0.2, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
      dragon.marker.rotation.x = Math.PI / 2;
      dragon.marker.position.set(target.x, this.groundAt(target.x, target.z) + 0.1, target.z);
      this.scene.add(dragon.marker);
      audio.play('rockWarning');
      dragon.jump = { from: dragon.pos.clone(), to: target, startedAt: this.now, duration: 1700 * (this.settings.bossActionMs / 2000) };
    } else {
      audio.play('bossRoar');
      dragon.charge = { from: dragon.pos.clone(), to: target, startedAt: this.now };
    }
  }

  dragonLands() {
    const dragon = this.dragon;
    dragon.jump = null;
    this.scene.remove(dragon.marker);
    dragon.marker = null;
    audio.play('pound');
    this.shakeUntil = this.now + 600;
    this.pop(dragon.pos.clone().addScaledVector(UP, 0.5), 0xbcaaa4, 5);
    const p = this.player;
    if (Math.hypot(p.pos.x - dragon.pos.x, p.pos.z - dragon.pos.z) < 5 && p.onGround) this.hurt(dragon.pos);
  }

  hitDragon(damage, shot) {
    const dragon = this.dragon;
    if (!dragon || dragon.state !== 'fighting') return;
    // Ice and vines can't stop a dragon, but they slow him down
    if (shot?.power === 'ice' || shot?.power === 'vine') dragon.slowUntil = this.now + SLOW_MS;
    dragon.hp = Math.max(0, dragon.hp - damage);
    this.hud.showBoss(dragon.hp / dragon.maxHp);
    audio.play('bossHit');
    if (this.active('invisible')) this.player.until.invisible = this.now;
    if (dragon.hp === 0) this.defeatDragon();
  }

  // The first time: the cages open and the babies join you! In a rematch: bolts, and maybe a rainbow egg.
  defeatDragon() {
    const dragon = this.dragon;
    dragon.state = 'defeated';
    if (dragon.marker) this.scene.remove(dragon.marker);
    audio.stopMusic();
    audio.play('explosion');
    this.shakeUntil = this.now + 1200;
    for (let i = 0; i < 8; i++) this.pop(this.dragonCenter().add(new THREE.Vector3().randomDirection().multiplyScalar(3)), 0x66bb6a, 3);
    this.scene.remove(dragon.mesh);
    for (const shot of this.shots.filter((s) => !s.fromPlayer)) shot.life = 0;
    this.hud.hideBoss();
    this.giveXp(10);
    const bolts = BOSS_REWARD * (dragon.rematch ? 2 : 5);
    this.addBolts(bolts);
    if (!dragon.rematch) {
      for (const cage of this.cages) {
        cage.bars.visible = false;
        cage.baby.visible = false;
        this.pop(cage.baby.position.clone().addScaledVector(UP, 1), 0xffd23f, 1.5);
      }
      this.quest.dragonBeaten = true;
      for (const baby of CAGED_BABIES) this.addBaby(baby.animal, baby.color);
      this.hud.message(t('quest.dragonBeaten'), t('quest.rescued'), 5000);
    } else if (Math.random() < RAINBOW_EGG_CHANCE) {
      this.dropEgg(dragon.pos);
    } else {
      const count = bolts * (this.save.powerUps.includes('double') ? 2 : 1);
      this.hud.message(t('quest.dragonBeaten'), t('adv.gotBolts', { count }), 4000);
    }
    setTimeout(() => {
      if (this.ended) return;
      audio.play('win');
      audio.playMusic('menu');
    }, 2500);
  }

  // ---------- The rainbow egg ----------

  dropEgg(at) {
    const mesh = models.makeEgg();
    const pos = vec(at.x, this.groundAt(at.x, at.z), at.z);
    mesh.position.copy(pos);
    mesh.scale.setScalar(1.5);
    this.scene.add(mesh);
    this.egg = { mesh, pos };
    audio.play('forceField');
    this.hud.message(t('quest.egg'), t('quest.eggSub'), 4000);
  }

  updateEgg() {
    const egg = this.egg;
    if (!egg) return;
    egg.mesh.rotation.y += 0.03;
    egg.mesh.position.y = egg.pos.y + Math.abs(Math.sin(this.now / 250)) * 0.3;
    if (Math.hypot(this.player.pos.x - egg.pos.x, this.player.pos.z - egg.pos.z) > 1.8) return;
    this.scene.remove(egg.mesh);
    this.egg = null;
    this.pop(egg.pos.clone().addScaledVector(UP, 1), 0xffffff, 2.5);
    const baby = this.addBaby(Math.random() < 0.5 ? 'cat' : 'capybara', 'rainbow');
    this.hud.message(t('quest.hatched'), `${this.babyName(baby)}${baby.team ? '' : `  ${t('quest.teamFull')}`}`, 4000);
  }
}
