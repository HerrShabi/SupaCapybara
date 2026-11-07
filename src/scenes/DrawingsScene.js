import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { writeSave } from '../save.js';
import { SideScrollerScene, VIEW_WIDTH, VIEW_HEIGHT } from './SideScrollerScene.js';
import { PAPER, pen, pencil, ellipsePoints, rectPoints, createDoodleHeroTextures, createDoodleBadGuyTextures, createDoodleBossTextures, createDoodleHatTextures, doodleHeroKey, doodleHatAnchor, DOODLE_HAT_PREFIX } from '../art/doodle.js';

// THE DRAWINGS WORLD (Ethan's round 11 design): a level inside Ethan's notebook. Everything is drawn with wobbly
// blue pen and colored pencils (art/doodle.js): pen-scribble hills, kid clouds, a smiley sun, stick trees, and
// school supplies to jump on (rulers, erasers, giant pencils, paper clips). The heroes are drawings shaped like
// Ethan's clay models, and the bad guys come from his "Bad guys" page.
// The end: Pizza Boss AND Grape Boss fight together. When one of them gets low, they MERGE into the
// PIZZA-GRAPE MONSTER: pizza-slice boomerangs and grape bombs that leave sticky (slow) puddles.
// The prize: the MAGIC PENCIL (save.magicPencil, see SideScrollerScene's magic pencil).
// It's open from the start: the door on the title screen.

const ARENA_START = 4000;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440;

// Doodle hills: [x, width, top]. The gaps are a fall.
const GROUND = [
  [0, 640, 440],
  [760, 420, 410],
  [1300, 520, 440],
  [1950, 380, 400],
  [2450, 560, 430],
  [3120, 420, 410],
  [3660, 340, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR],
];
// School supplies to jump on: [kind, x, top, width]
const SUPPLIES = [
  ['ruler', 380, 320, 170],
  ['eraser', 900, 300, 90],
  ['pencil', 1450, 310, 200],
  ['clip', 2060, 280, 110],
  ['ruler', 2600, 300, 170],
  ['pencil', 3200, 290, 200],
  ['eraser', 3760, 320, 90],
  ['pencil', ARENA_START + 140, 320, 170],
  ['ruler', ARENA_START + 650, 320, 170],
];
const TREES = [250, 1100, 1700, 2350, 2900, 3500];
const BOLTS = [
  [200, 400, 3],
  [420, 280, 3],
  [920, 260, 2],
  [1500, 270, 3],
  [2080, 240, 3],
  [2640, 260, 3],
  [3240, 250, 3],
  [3700, 400, 2],
];

const PIZZA_HOME = ARENA_START + 260;
const GRAPE_HOME = ARENA_START + 700;
const MERGE_AT = 0.35; // when either boss gets this low, they merge
const MONSTER_HP = 1.3; // times a normal boss
const HOVER = 7; // the heroes float this far above the drawn ground (Ethan's idea)
const PUDDLE_MS = 4500;
const PUDDLE_SLOW = 0.35; // you move this fast in a sticky puddle

export class DrawingsScene extends SideScrollerScene {
  constructor() {
    super('Drawings', {
      world: 'Drawings',
      titleKey: 'drawings.title',
      exitTo: 'Title',
      keyId: 'drawings',
      music: 'city',
      bossName: 'drawings.bosses',
      width: LEVEL_WIDTH,
      arenaStart: ARENA_START,
      start: { x: 100, y: 360 },
      arenaCheckpoint: { x: ARENA_START + 100, y: 360 },
      bolts: BOLTS,
      sunglasses: [
        [600, 400],
        [2200, 320],
        [3350, 330],
      ],
      apples: [1550, 2700, 3800],
      robots: [
        [800, 1100],
        [3150, 3450],
      ],
      knights: [
        [380, 560, 220],
        [1950, 2250, 170],
        [2900, 3100, 180],
      ],
    });
  }

  create(data = {}) {
    createDoodleHeroTextures(this);
    createDoodleBadGuyTextures(this);
    createDoodleBossTextures(this);
    createDoodleHatTextures(this);
    this.heroLook = (id) => doodleHeroKey(id);
    this.hatStyle = { prefix: DOODLE_HAT_PREFIX, anchor: doodleHatAnchor }; // drawn hats, on the doodle heads
    this.phase = 'duo';
    this.puddles = [];
    super.create(data);
    // The bad guys become drawings too
    const looks = { sunglasses: 'doodle-sunglasses', apple: 'doodle-apple', robot: 'doodle-robot', knight: 'doodle-knight' };
    for (const badGuy of this.badGuys.getChildren()) {
      const look = looks[badGuy.getData('kind')];
      if (look) badGuy.setTexture(look);
    }
    this.shotTexture = 'doodle-shot';
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  // ---------- The notebook page ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(PAPER);
    // Notebook lines and the red margin stay put, like the page you're looking at
    const page = this.add.graphics().setScrollFactor(0);
    page.lineStyle(1, 0x90caf9, 0.8);
    for (let y = 40; y < VIEW_HEIGHT; y += 30) page.lineBetween(0, y, VIEW_WIDTH, y);
    page.lineStyle(2, 0xef9a9a, 0.9).lineBetween(70, 0, 70, VIEW_HEIGHT);
    // The smiley sun in the corner
    const sun = this.add.graphics().setScrollFactor(0);
    pencil(sun, ellipsePoints(850, 80, 38, 38), 0xffeb3b);
    pen(sun, ellipsePoints(850, 80, 38, 38), { closed: true });
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      pen(sun, [[850 + Math.cos(angle) * 46, 80 + Math.sin(angle) * 46], [850 + Math.cos(angle) * 62, 80 + Math.sin(angle) * 62]], { color: 0xffa000, width: 3 });
    }
    sun.fillStyle(0x000000).fillCircle(838, 72, 4).fillCircle(862, 72, 4);
    pen(sun, [[834, 88], [850, 98], [866, 88]], { width: 2.5 });
    // Kid clouds drifting slowly
    const clouds = this.add.graphics().setScrollFactor(0.25);
    for (let i = 0; i < 12; i++) {
      const x = 120 + i * 330;
      const y = 90 + (i % 3) * 40;
      // A kid cloud: puffy bumps on top of a flat bottom
      const bumps = [[x + 22, y, 22], [x + 50, y - 12, 28], [x + 82, y - 2, 22], [x + 104, y + 6, 16]];
      for (const [cx, cy, r] of bumps) pencil(clouds, ellipsePoints(cx, cy, r, r), 0xe3f2fd, { strokes: false });
      clouds.fillStyle(0xe3f2fd, 0.55).fillRect(x + 4, y + 2, 112, 18);
      const outline = [];
      for (const [cx, cy, r] of bumps) for (let k = 0; k <= 6; k++) outline.push([cx + Math.cos(Math.PI + (k / 6) * Math.PI) * r, cy + Math.sin(Math.PI + (k / 6) * Math.PI) * r]);
      outline.push([x + 120, y + 20], [x, y + 20]);
      pen(clouds, outline, { closed: true, color: 0x5c6bc0 });
    }

    const land = this.add.graphics();
    // Stick-figure trees
    for (const x of TREES) {
      const top = (this.groundAt(x)?.top ?? FLOOR) + HOVER;
      pen(land, [[x, top], [x, top - 90]], { color: 0x6d4c41, width: 5 });
      pen(land, [[x, top - 60], [x - 18, top - 78]], { color: 0x6d4c41, width: 3 });
      const crown = ellipsePoints(x, top - 110, 36, 30);
      pencil(land, crown, 0x66bb6a);
      pen(land, crown, { closed: true });
    }

    // Pen-scribble hills
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      const hill = [[x, VIEW_HEIGHT + 10]];
      // (drawn a little below where you stand, so the heroes float just above the pen line)
      for (let px = x; px <= x + width; px += 40) hill.push([px, top + HOVER + Math.sin(px / 60) * 2]);
      hill.push([x + width, VIEW_HEIGHT + 10]);
      pencil(land, hill, x === ARENA_START ? 0xffe082 : 0xa5d6a7);
      pen(land, hill.slice(1, -1), { width: 2.5 });
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }

    // School supplies (you can jump up through them)
    this.platforms = this.physics.add.staticGroup();
    const supplies = this.add.graphics().setDepth(1);
    for (const [kind, x, top, width] of SUPPLIES) {
      this.drawSupply(supplies, kind, x, top, width);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
    this.puddleGraphics = this.add.graphics().setDepth(1.5);
  }

  drawSupply(g, kind, x, top, width) {
    if (kind === 'ruler') {
      pencil(g, rectPoints(x, top, width, 18), 0xffeb3b);
      pen(g, rectPoints(x, top, width, 18), { closed: true });
      for (let tx = x + 10; tx < x + width; tx += 10) pen(g, [[tx, top], [tx, top + ((tx - x) % 50 ? 6 : 10)]], { width: 1.2, wobble: 0.5 });
    } else if (kind === 'eraser') {
      pencil(g, rectPoints(x, top, width, 30), 0xf48fb1);
      pencil(g, rectPoints(x, top, width * 0.4, 30), 0x64b5f6);
      pen(g, rectPoints(x, top, width, 30), { closed: true });
    } else if (kind === 'pencil') {
      const body = [[x + 22, top], [x + width - 24, top], [x + width - 24, top + 20], [x + 22, top + 20]];
      pencil(g, body, 0xffca28);
      pencil(g, rectPoints(x, top, 22, 20), 0xf06292); // eraser end
      pencil(g, [[x + width - 24, top], [x + width, top + 10], [x + width - 24, top + 20]], 0xd7ccc8); // sharpened tip
      g.fillStyle(0x424242).fillTriangle(x + width - 8, top + 6, x + width, top + 10, x + width - 8, top + 14);
      pen(g, [[x, top], [x + width - 24, top], [x + width, top + 10], [x + width - 24, top + 20], [x, top + 20]], { closed: true });
      pen(g, [[x + 22, top], [x + 22, top + 20]], { width: 1.5 });
    } else {
      // A paper clip
      pen(g, [[x, top + 4], [x + width, top + 4], [x + width, top + 18], [x + 12, top + 18], [x + 12, top + 9], [x + width - 12, top + 9]], { color: 0x78909c, width: 4 });
    }
  }

  updateScenery() {
    // Sticky grape puddles fade away
    const g = this.puddleGraphics.clear();
    const now = this.time.now;
    this.puddles = this.puddles.filter((puddle) => now < puddle.until);
    for (const puddle of this.puddles) {
      g.fillStyle(0x8e24aa, 0.6 * Math.min(1, (puddle.until - now) / 800)).fillEllipse(puddle.x, puddle.y, 120, 18);
    }
  }

  // Standing in a sticky puddle slows you right down
  update(time, delta) {
    super.update(time, delta);
    if (this.won || !this.puddles.length) return;
    for (const player of this.players) {
      const body = player.sprite.body;
      if (body.blocked.down && this.puddles.some((p) => Math.abs(player.x - p.x) < 60 && Math.abs(body.bottom - p.y) < 20)) {
        body.setVelocityX(body.velocity.x * PUDDLE_SLOW);
      }
    }
  }

  // ---------- Pizza Boss and Grape Boss (then the PIZZA-GRAPE MONSTER) ----------

  createBoss() {
    this.boss = this.physics.add.sprite(PIZZA_HOME, -200, 'doodle-pizza').setDepth(2);
    this.boss.body.setSize(90, 140).setOffset(25, 15);
    this.boss.setCollideWorldBounds(true);
    this.boss.disableBody(true, true);
    this.physics.add.collider(this.boss, this.solids, () => this.landed(this.boss));

    this.grape = this.physics.add.sprite(GRAPE_HOME, -200, 'doodle-grape').setDepth(2);
    this.grape.body.setSize(100, 140).setOffset(25, 20);
    this.grape.setCollideWorldBounds(true);
    this.grape.disableBody(true, true);
    this.physics.add.collider(this.grape, this.solids, () => this.landed(this.grape));
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.grape, () => {
        if (!this.grapeHittable()) return;
        if (this.isStomp(this.grape, player)) {
          player.stompBounce();
          audio.play('stomp');
          this.safeUntil = Math.max(this.safeUntil, this.time.now + 250);
          this.damageDuo(this.grape, 1);
        } else this.hurt(this.grape.x, player);
      });
      this.physics.add.overlap(this.grape, player.lasers, (grape, laser) => {
        if (!this.grapeHittable()) return;
        this.damageDuo(this.grape, laser.getData('damage'));
        laser.destroy();
        player.landedHit();
      });
    }

    // The monster's weapons
    this.slices = this.physics.add.group({ allowGravity: false });
    this.grapeBombs = this.physics.add.group();
    this.physics.add.collider(this.grapeBombs, this.solids, (bomb) => this.splat(bomb));
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.slices, () => this.hurt(this.boss.x, player));
      this.physics.add.overlap(player.sprite, this.grapeBombs, (sprite, bomb) => {
        this.splat(bomb);
        this.hurt(bomb.x, player);
      });
    }
  }

  grapeHittable() {
    return this.phase === 'duo' && this.grape.active && this.grape.body.enable;
  }

  // They both drop in from the top of the page
  bossEntrance() {
    const hp = this.settings.bossHp;
    this.boss.enableBody(true, PIZZA_HOME, -150, true, true);
    this.grape.enableBody(true, GRAPE_HOME, -250, true, true);
    this.boss.setData('hp', hp);
    this.grape.setData('hp', hp);
    this.duoHp = hp;
    audio.play('bossRoar');
    this.time.delayedCall(1800, () => this.startBossActions());
  }

  landed(boss) {
    if (!boss.getData('slamming') || boss.body.velocity.y < 0) return;
    boss.setData('slamming', false);
    audio.play('pound');
    this.cameras.main.shake(250, 0.012);
    for (const dir of [-1, 1]) this.enemyShoot(boss.x + dir * 50, FLOOR - 14, dir * this.settings.enemyShotSpeed, 0);
  }

  bossAction() {
    if (this.phase === 'merging') return;
    const target = (from) => this.nearestPlayer(from.x);
    if (this.phase === 'duo') {
      const actor = Math.random() < 0.5 ? this.boss : this.grape;
      const dir = target(actor).x < actor.x ? -1 : 1;
      if (actor === this.boss) {
        const action = Phaser.Math.RND.pick(['shoot', 'shoot', 'jump', 'charge']);
        if (action === 'shoot') for (const vy of [-120, 0, 120]) this.enemyShoot(actor.x + dir * 70, actor.y + 10, dir * this.settings.enemyShotSpeed, vy);
        else if (action === 'jump' && actor.body.blocked.down) actor.setVelocity(dir * 220, -650);
        else actor.setVelocityX(dir * 340);
      } else if (actor.body.blocked.down && Math.random() < 0.6) {
        // Grape Boss jumps high and lands with a shockwave
        actor.setVelocity(dir * Math.min(Math.abs(target(actor).x - actor.x), 320), -720);
        actor.setData('slamming', true);
      } else {
        for (const vy of [-60, 60]) this.enemyShoot(actor.x + dir * 70, actor.y + 20, dir * this.settings.enemyShotSpeed, vy);
      }
      return;
    }
    // The PIZZA-GRAPE MONSTER
    const monster = this.boss;
    const dir = target(monster).x < monster.x ? -1 : 1;
    const action = Phaser.Math.RND.pick(['boomerang', 'boomerang', 'grapes', 'stomp']);
    if (action === 'boomerang') this.throwSlice(dir);
    else if (action === 'grapes') this.dropGrapes();
    else if (monster.body.blocked.down) {
      monster.setVelocity(dir * 260, -700);
      monster.setData('slamming', true);
    }
  }

  // A spinning pizza slice flies out and comes back like a boomerang
  throwSlice(dir) {
    const monster = this.boss;
    const y = monster.y + Phaser.Math.Between(-10, 40);
    const slice = this.slices.create(monster.x + dir * 60, y, 'doodle-slice').setScale(1.3);
    slice.setAngularVelocity(720);
    audio.play('scratch');
    this.tweens.add({
      targets: slice,
      x: Phaser.Math.Clamp(monster.x + dir * 560, ARENA_START + 30, LEVEL_WIDTH - 30),
      duration: 750,
      ease: 'Sine.easeOut',
      yoyo: true,
      onUpdate: () => slice.body?.updateFromGameObject?.(),
      onComplete: () => slice.destroy(),
    });
  }

  // Grape bombs rain down where you are
  dropGrapes() {
    const target = this.nearestPlayer(this.boss.x);
    audio.play('rockWarning');
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 220, () => {
        if (this.phase !== 'monster') return;
        const x = Phaser.Math.Clamp(target.x + (i - 1.5) * 110, ARENA_START + 30, LEVEL_WIDTH - 30);
        const bomb = this.grapeBombs.create(x, -20, 'doodle-grapebomb').setScale(1.2);
        bomb.setVelocityY(120);
      });
    }
  }

  // SPLAT: a sticky purple puddle
  splat(bomb) {
    if (!bomb.active) return;
    audio.play('splat');
    this.puddles.push({ x: bomb.x, y: FLOOR, until: this.time.now + PUDDLE_MS });
    bomb.destroy();
  }

  // (The bosses are drawn facing you, so they don't need to turn around)
  updateBoss() {
    for (const boss of this.phase === 'duo' ? [this.boss, this.grape] : [this.boss]) {
      if (boss.active && boss.body.enable && boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.96);
    }
  }

  // Hits: in the duo, each boss has its own health (the bar shows both); then the monster's.
  hitBoss(amount) {
    if (this.phase === 'merging') return;
    if (this.phase === 'monster') return super.hitBoss(amount);
    this.damageDuo(this.boss, amount);
  }

  damageDuo(boss, amount) {
    if (this.phase !== 'duo') return;
    const hp = Math.max(0, boss.getData('hp') - amount);
    boss.setData('hp', hp);
    boss.setTintFill(0xffffff);
    this.time.delayedCall(60, () => boss.clearTint());
    audio.play('bossHit');
    this.bossBar.width = (400 * (this.boss.getData('hp') + this.grape.getData('hp'))) / (2 * this.duoHp);
    if (hp <= this.duoHp * MERGE_AT) this.merge();
  }

  hitArea(area, damage) {
    let hit = false;
    if (this.grapeHittable() && Phaser.Geom.Intersects.RectangleToRectangle(area, this.grape.getBounds())) {
      this.damageDuo(this.grape, damage);
      hit = true;
    }
    return super.hitArea(area, damage) || hit;
  }

  // The magic pencil's bomb hits Grape Boss too
  blastAt(x, y, radius, damage) {
    if (this.grapeHittable() && Phaser.Math.Distance.Between(x, y, this.grape.x, this.grape.y) < radius + 80) this.damageDuo(this.grape, damage);
    super.blastAt(x, y, radius, damage);
  }

  // They run together, flash... and MERGE!
  merge() {
    this.phase = 'merging';
    const center = { x: ARENA_START + VIEW_WIDTH / 2, y: 250 };
    for (const boss of [this.boss, this.grape]) {
      boss.body.enable = false;
      this.tweens.add({ targets: boss, x: center.x, y: center.y, duration: 1100, ease: 'Sine.easeInOut' });
    }
    this.enemyShots.clear(true, true);
    const message = this.bigMessage(t('drawings.merge'), '#8e24aa').setScale(0.8);
    audio.play('bossRoar');
    this.time.delayedCall(1200, () => {
      message.destroy();
      this.cameras.main.flash(400, 255, 255, 255);
      this.cameras.main.shake(500, 0.02);
      audio.play('explosion');
      this.grape.disableBody(true, true);
      const monster = this.boss;
      monster.setTexture('doodle-monster').setPosition(center.x, center.y);
      monster.body.enable = true;
      monster.body.setSize(160, 170).setOffset(30, 30);
      const hp = Math.ceil(this.duoHp * MONSTER_HP);
      this.settings = { ...this.settings, bossHp: hp };
      monster.setData('hp', hp);
      this.bossBar.width = 400;
      this.bossNameText?.setText(t('drawings.monster'));
      this.phase = 'monster';
    });
  }

  defeatBoss() {
    this.slices.clear(true, true);
    this.grapeBombs.clear(true, true);
    this.puddles = [];
    super.defeatBoss();
  }

  // ---------- Winning: the MAGIC PENCIL ----------

  winLines() {
    return [t('drawings.gotPencil')];
  }

  afterWin() {
    this.save.magicPencil = true;
    writeSave(this.save);
    this.time.delayedCall(1500, () => this.scene.start('Title'));
  }
}

