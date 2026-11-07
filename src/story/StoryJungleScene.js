import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../scenes/SideScrollerScene.js';
import { createJungleTextures, drawJungleTree, drawBranch, drawStatue, drawTemple } from '../art/jungle.js';
import { StoryLevelScene } from './StoryLevelScene.js';
import { PLACES } from './story.js';

// THE BAD GUY KING, place 3: 🌴 the Jungle (Ethan's round 8 design).
// - Vines: jump into one and you grab it; swing (left/right pumps it) and press jump to let go and fly.
//   Some vines are SNAKES (look closely: tiny eyes and a flicking tongue). Grab one and it hisses: you fall.
// - Monkeys throw coconuts. Hit a coconut (any attack) and it flies back and knocks the monkey out!
// - Chomping flowers stretch their long necks out to bite.
// - A stone statue on a high ledge (reach it with the super long vine) asks a quiz question.
//   Answer right: its door opens and bolts pour out of the secret room.
// - At the end, in the old temple: Dark Ultra Capybara with a purple fire aura. Touching it burns (even
//   jumping on it), so attack from far away.

const PLACE = PLACES.find((p) => p.id === 'jungle');
const ARENA_START = 4300;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440;

// Jungle floor: [x, width, top]. The gaps need a vine!
const GROUND = [
  [0, 600, 440],
  [930, 420, 440],
  [1700, 500, 430],
  [2560, 840, 420],
  [3760, 540, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR],
];
// Branches to stand on (jump up through them): [x, top, width]. The last one is the statue's ledge.
const BRANCHES = [
  [1050, 300, 120],
  [1900, 290, 120],
  [2700, 300, 120],
  [3900, 300, 120],
];
const STATUE_LEDGE = [3080, 220, 240];
const STATUE = { x: 3200, y: 220 };
// Vines: [anchorX, anchorY, length, snake?]
// You grab a vine on the way DOWN, so a jump from the edge sails over a snake vine to the real one behind it.
const VINES = [
  [710, 40, 270, false],
  [1440, 40, 240, true],
  [1545, 40, 320, false],
  [2310, 40, 270, false],
  [2900, 10, 300, false], // the super long vine up to the statue
  [3490, 40, 240, true],
  [3595, 40, 320, false],
];
const MONKEYS = [
  [1110, 300],
  [1960, 290],
  [2760, 300],
  [3960, 300],
];
const FLOWERS = [1250, 2060, 3320, 4120];
const BOLTS = [
  [200, 400, 3],
  [740, 300, 3],
  [1000, 400, 2],
  [1530, 280, 3],
  [1800, 390, 3],
  [2360, 300, 3],
  [2620, 380, 2],
  [3580, 300, 3],
  [3850, 400, 2],
];
const QUESTIONS = 6; // quiz.q1 ... quiz.q6 in i18n.js (a1 is always the right answer)
const SECRET_BOLTS = 14;

const SWING_GRAVITY = 1400;
const SWING_PUMP = 2.2; // how much left/right pushes the swing
const MAX_ANGLE = 1.35;
const LET_GO_BOOST = 260; // extra jump up when you let go
const GRAB_REACH = 40;
const COCONUT_TIME = 1.1; // seconds a thrown coconut takes to reach you
const FLOWER_REACH = 230;

const TROPHY = { x: LEVEL_WIDTH - 130, y: FLOOR };
const COPY_HOME = { x: LEVEL_WIDTH - 320, y: FLOOR - 40 };
const COPY_FIRE = 0xb388ff;

export class StoryJungleScene extends StoryLevelScene {
  constructor() {
    super(
      'StoryJungle',
      {
        world: 'Jungle',
        titleKey: 'story.place.jungle',
        keyId: 'story-jungle',
        bossName: 'story.darkUltra',
        width: LEVEL_WIDTH,
        arenaStart: ARENA_START,
        start: { x: 100, y: 360 },
        arenaCheckpoint: { x: ARENA_START + 140, y: 360 },
        bolts: BOLTS,
        sunglasses: [],
        apples: [],
        robots: [],
        tips: [
          ['vine', 540, 710, 300],
          ['snakeVine', 1230, 1440, 300],
          ['statue', 2840, STATUE.x, STATUE.y - 80],
        ],
      },
      { place: PLACE, trophy: TROPHY },
    );
  }

  create(data = {}) {
    createJungleTextures(this);
    this.launches = [];
    this.quiz = null;
    this.quizDone = false;
    this.quizAsked = [];
    this.quizReadyAt = 0;
    super.create(data);
    this.createVines();
    this.createMonkeysAndFlowers();
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  // ---------- The jungle ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x81c784);
    const sky = this.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.IntegerToColor(0xa5d6a7), Phaser.Display.Color.IntegerToColor(0x2e7d32), 9, i);
      sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      sky.fillRect(0, i * 54, VIEW_WIDTH, 54);
    }
    const far = this.add.graphics().setScrollFactor(0.3);
    for (let x = 0; x < LEVEL_WIDTH * 0.3 + VIEW_WIDTH; x += 150) drawJungleTree(far, x, 520, 260 + (x % 3) * 30, true);
    // The temple at the end (behind everything in the arena)
    const temple = this.add.graphics();
    drawTemple(temple, ARENA_START, VIEW_WIDTH, FLOOR);

    const ground = this.add.graphics();
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      const stone = x === ARENA_START;
      ground.fillStyle(stone ? 0x546e7a : 0x6d4c41);
      ground.fillRect(x, top, width, VIEW_HEIGHT - top);
      ground.fillStyle(stone ? 0x78909c : 0x43a047);
      ground.fillRect(x, top, width, 12);
      if (!stone) for (let gx = x + 10; gx < x + width; gx += 22) ground.fillTriangle(gx, top, gx + 8, top - 10, gx + 14, top);
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }
    this.platforms = this.physics.add.staticGroup();
    const branches = this.add.graphics();
    for (const [x, top, width] of [...BRANCHES, STATUE_LEDGE]) {
      drawBranch(branches, x, top, width);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
    this.statue = this.add.graphics();
    drawStatue(this.statue, STATUE.x, STATUE.y, false);
    // Leafy treetops along the top, where the vines hang from
    const canopy = this.add.graphics().setDepth(4);
    canopy.fillStyle(0x1b5e20);
    for (let x = 0; x < ARENA_START; x += 46) canopy.fillCircle(x, 6 + (x % 3) * 6, 34);
    this.createTrophy();
    // A purple glow in the temple (the copy's fire lights it up)
    this.templeLight = this.add.circle(COPY_HOME.x, COPY_HOME.y, 220, COPY_FIRE, 0).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
  }

  updateScenery() {
    for (const flower of this.flowers ?? []) this.drawStem(flower);
  }

  // ---------- Vines ----------

  createVines() {
    this.vines = VINES.map(([x, y, length, snake], i) => ({ x, y, length, snake, angle: 0, phase: i * 1.7, g: this.add.graphics().setDepth(3), holder: null }));
  }

  updateVines(delta) {
    const now = this.time.now;
    for (const vine of this.vines) {
      if (!vine.holder) vine.angle = 0.14 * Math.sin(now / 900 + vine.phase); // swaying in the breeze
      const end = { x: vine.x + Math.sin(vine.angle) * vine.length, y: vine.y + Math.cos(vine.angle) * vine.length };
      const g = vine.g.clear();
      g.lineStyle(6, 0x558b2f).lineBetween(vine.x, vine.y, end.x, end.y);
      g.fillStyle(0x7cb342);
      for (let k = 0.15; k < 0.95; k += 0.14) {
        const lx = vine.x + (end.x - vine.x) * k;
        const ly = vine.y + (end.y - vine.y) * k;
        g.fillEllipse(lx + (k * 10 > 0.7 ? 6 : -6), ly, 12, 6);
      }
      if (vine.snake) {
        // The tiny giveaway: eyes and a flicking tongue at the bottom
        g.fillStyle(0x33691e).fillCircle(end.x, end.y, 7);
        g.fillStyle(0xffffff).fillCircle(end.x - 3, end.y - 2, 2.5).fillCircle(end.x + 3, end.y - 2, 2.5);
        g.fillStyle(0x000000).fillCircle(end.x - 3, end.y - 2, 1).fillCircle(end.x + 3, end.y - 2, 1);
        if (Math.floor(now / 350 + vine.phase) % 3 === 0) g.lineStyle(2, 0xe53935).lineBetween(end.x, end.y + 6, end.x, end.y + 14);
      }
      vine.end = end;
    }
    for (const player of this.players) {
      if (player.vine) this.swing(player, delta);
      else this.tryGrab(player);
    }
  }

  tryGrab(player) {
    const body = player.sprite.body;
    if (body.blocked.down || body.velocity.y < -120 || this.time.now < (player.regrabAt ?? 0)) return;
    for (const vine of this.vines) {
      if (vine.holder) continue;
      const dx = player.x - vine.x;
      const dy = player.y - vine.y;
      const along = dx * Math.sin(vine.angle) + dy * Math.cos(vine.angle);
      const across = Math.abs(dx * Math.cos(vine.angle) - dy * Math.sin(vine.angle));
      if (along < vine.length * 0.55 || along > vine.length + 45 || across > GRAB_REACH) continue;
      if (vine.snake) {
        // HISS! It's a snake. Off you go.
        audio.play('hiss');
        player.regrabAt = this.time.now + 700;
        player.sprite.setVelocity(player.sprite.body.velocity.x * 0.3, 120);
        const words = this.add.text(vine.end.x, vine.end.y - 30, t('story.hiss'), { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#c6ff00' }).setStroke('#000000', 5).setOrigin(0.5).setDepth(6);
        this.tweens.add({ targets: words, y: words.y - 40, alpha: 0, duration: 900, onComplete: () => words.destroy() });
        return;
      }
      // Grab it! Start swinging from where you are, with the speed you had.
      vine.angle = Phaser.Math.Clamp(Math.atan2(dx, dy), -MAX_ANGLE, MAX_ANGLE);
      vine.omega = (body.velocity.x * Math.cos(vine.angle) - body.velocity.y * Math.sin(vine.angle)) / vine.length;
      vine.holder = player;
      player.vine = vine;
      player.held = true;
      this.removeLaunch(player);
      body.setAllowGravity(false);
      player.sprite.anims.stop();
      player.sprite.setTexture(`${player.look}-jump`);
      audio.play('click');
      return;
    }
  }

  swing(player, delta) {
    const vine = player.vine;
    const dt = delta / 1000;
    const c = player.controls;
    const push = (c.isDown('right') ? 1 : 0) - (c.isDown('left') ? 1 : 0);
    vine.omega += (-(SWING_GRAVITY / vine.length) * Math.sin(vine.angle) + push * SWING_PUMP) * dt;
    vine.omega *= 1 - 0.1 * dt;
    vine.angle += vine.omega * dt;
    if (Math.abs(vine.angle) > MAX_ANGLE) {
      vine.angle = Math.sign(vine.angle) * MAX_ANGLE;
      vine.omega = 0;
    }
    const x = vine.x + Math.sin(vine.angle) * vine.length;
    const y = vine.y + Math.cos(vine.angle) * vine.length;
    player.sprite.body.reset(x, y);
    if (Math.abs(vine.omega) > 0.05) player.sprite.setFlipX(vine.omega < 0);
    if (c.justPressed('jump')) this.letGo(player);
  }

  // Let go and fly the way you were swinging
  letGo(player) {
    const vine = player.vine;
    const speed = vine.length * vine.omega;
    const vx = speed * Math.cos(vine.angle);
    const vy = -speed * Math.sin(vine.angle) - LET_GO_BOOST;
    vine.holder = null;
    player.vine = null;
    player.held = false;
    player.regrabAt = this.time.now + 400;
    player.sprite.body.setAllowGravity(true);
    player.sprite.setVelocity(vx, vy);
    audio.play('jump');
    // (The hero's own controls would stop this flight right away, so the scene keeps it going until you land)
    this.launches.push({ player, vx, vy, until: this.time.now + 1400 });
  }

  removeLaunch(player) {
    this.launches = this.launches.filter((launch) => launch.player !== player);
  }

  updateLaunches(delta) {
    const dt = delta / 1000;
    for (const launch of this.launches) {
      const { player } = launch;
      launch.vy += this.physics.world.gravity.y * dt;
      const body = player.sprite.body;
      if (body.blocked.down || this.time.now > launch.until) launch.done = true;
      if (Math.abs(launch.vx) > 260) player.sprite.setVelocityX(launch.vx);
      if (launch.vy < -200) player.sprite.setVelocityY(launch.vy);
      if (body.blocked.left || body.blocked.right) launch.vx = 0;
    }
    this.launches = this.launches.filter((launch) => !launch.done);
  }

  // Falling down a gap (or losing your last heart) lets go of any vine
  respawn() {
    for (const player of this.players) if (player.vine) this.letGo(player);
    this.launches = [];
    super.respawn();
  }

  // ---------- Monkeys, coconuts and chomping flowers ----------

  createMonkeysAndFlowers() {
    this.coconuts = this.physics.add.group();
    this.physics.add.collider(this.coconuts, this.solids, (coconut) => this.crackCoconut(coconut));
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.coconuts, (sprite, coconut) => {
        if (coconut.getData('returned')) return;
        this.crackCoconut(coconut);
        this.hurt(coconut.x, player);
      });
      this.physics.add.overlap(player.lasers, this.coconuts, (laser, coconut) => {
        if (coconut.getData('returned')) return;
        laser.destroy();
        this.hitBack(coconut);
        player.landedHit();
      });
    }
    this.physics.add.overlap(this.coconuts, this.badGuys, (coconut, monkey) => {
      if (!coconut.getData('returned') || monkey.getData('kind') !== 'monkey') return;
      this.crackCoconut(coconut);
      this.defeat(monkey);
    });

    for (const [x, y] of MONKEYS) {
      const monkey = this.badGuys.create(x, y - 30, 'monkey').setScale(1.1);
      monkey.setData({ kind: 'monkey', faces: true, nextShotAt: 0, shotEveryMs: 2600, shoot: (m) => this.throwCoconut(m) });
    }
    this.flowers = FLOWERS.map((x) => {
      const root = { x, y: this.groundAt(x).top };
      const head = this.badGuys.create(x, root.y - 60, 'flower-head');
      head.setData({ kind: 'flower', root, nextShotAt: 0, shotEveryMs: 1500, shoot: (f, dir) => this.chomp(f, dir) });
      return { head, root, g: this.add.graphics().setDepth(1.9) };
    });
  }

  // Thrown in an arc that lands where you are
  throwCoconut(monkey) {
    const target = this.nearestPlayer(monkey.x);
    const coconut = this.coconuts.create(monkey.x, monkey.y - 20, 'coconut');
    const g = this.physics.world.gravity.y;
    coconut.setVelocity((target.x - coconut.x) / COCONUT_TIME, (target.y - coconut.y) / COCONUT_TIME - 0.5 * g * COCONUT_TIME);
    coconut.setAngularVelocity(300);
    coconut.setData({ thrower: monkey, returned: false });
    audio.play('jump');
    this.time.delayedCall(10, () => this.showTip('coconut', monkey.x, monkey.y));
    this.time.delayedCall(4000, () => coconut.destroy());
  }

  // BONK! Back to the monkey who threw it
  hitBack(coconut) {
    const monkey = coconut.getData('thrower');
    const target = monkey?.body?.enable ? monkey : this.badGuys.getChildren().find((b) => b.body.enable && b.getData('kind') === 'monkey');
    coconut.setData('returned', true).setTint(0xffeb3b);
    audio.play('bonk');
    if (!target) {
      coconut.setVelocity(0, -600);
      return;
    }
    const time = 0.5;
    const g = this.physics.world.gravity.y;
    coconut.setVelocity((target.x - coconut.x) / time, (target.y - coconut.y) / time - 0.5 * g * time);
  }

  crackCoconut(coconut) {
    if (!coconut.active) return;
    for (let i = 0; i < 4; i++) {
      const bit = this.add.rectangle(coconut.x, coconut.y, 6, 6, 0x5d4037).setDepth(3);
      this.tweens.add({ targets: bit, x: bit.x + Phaser.Math.Between(-30, 30), y: bit.y - Phaser.Math.Between(10, 40), alpha: 0, duration: 400, onComplete: () => bit.destroy() });
    }
    coconut.destroy();
  }

  // Any attack that touches a coconut hits it back
  hitArea(area, damage) {
    let hit = false;
    for (const coconut of this.coconuts.getChildren()) {
      if (!coconut.getData('returned') && Phaser.Geom.Intersects.RectangleToRectangle(area, coconut.getBounds())) {
        this.hitBack(coconut);
        hit = true;
      }
    }
    return super.hitArea(area, damage) || hit;
  }

  // CHOMP! The neck stretches out toward you and snaps back
  chomp(head, dir) {
    const root = head.getData('root');
    const target = this.nearestPlayer(root.x);
    if (Math.abs(target.x - root.x) > FLOWER_REACH || this.tweens.isTweening(head)) return;
    head.setFlipX(dir < 0);
    audio.play('scratch');
    this.tweens.add({ targets: head, x: root.x + dir * 140, y: root.y - 40, duration: 170, hold: 220, yoyo: true, ease: 'Quad.easeOut' });
  }

  drawStem(flower) {
    const { head, root, g } = flower;
    g.clear();
    if (!head.body?.enable) return;
    g.lineStyle(8, 0x388e3c).lineBetween(root.x, root.y, head.x, head.y);
    g.fillStyle(0x66bb6a).fillEllipse(root.x - 14, root.y - 6, 24, 10).fillEllipse(root.x + 14, root.y - 6, 24, 10);
  }

  // ---------- The quiz statue ----------

  checkStatue() {
    if (this.quizDone || this.quiz || this.time.now < this.quizReadyAt) return;
    const player = this.players.find((p) => Math.abs(p.x - STATUE.x) < 40 && Math.abs(p.sprite.body.bottom - STATUE.y) < 10);
    if (player) this.openQuiz(player);
  }

  openQuiz(player) {
    const unasked = Array.from({ length: QUESTIONS }, (_, i) => i + 1).filter((n) => !this.quizAsked.includes(n));
    const number = Phaser.Utils.Array.GetRandom(unasked.length ? unasked : [1, 2, 3, 4, 5, 6]);
    this.quizAsked.push(number);
    const answers = Phaser.Utils.Array.Shuffle([1, 2, 3]);
    this.freezeWorld();
    audio.play('bossRoar');
    const parts = [];
    const ui = (object) => parts.push(object.setScrollFactor(0).setDepth(30)) && object;
    ui(this.add.rectangle(480, 270, 960, 540, 0x000000, 0.5));
    ui(this.add.rectangle(480, 270, 640, 320, 0x37474f).setStrokeStyle(5, 0xffd23f));
    ui(this.add.text(480, 140, `🗿 ${t('quiz.title')}`, { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffd23f' }).setOrigin(0.5));
    ui(this.add.text(480, 190, t(`quiz.q${number}`), { fontFamily: 'Arial Black, Arial', fontSize: '21px', color: '#ffffff', align: 'center', wordWrap: { width: 580 } }).setOrigin(0.5));
    const rows = answers.map((a, i) => {
      const y = 260 + i * 56;
      const box = ui(this.add.rectangle(480, y, 460, 46, 0x263238).setStrokeStyle(3, 0x90a4ae));
      box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.answerQuiz(i));
      ui(this.add.text(480, y, t(`quiz.q${number}.a${a}`), { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5));
      return { box, right: a === 1 };
    });
    ui(this.add.text(480, 410, t('quiz.help'), { fontFamily: 'Arial', fontSize: '14px', color: '#cccccc' }).setOrigin(0.5));
    this.quiz = { player, parts, rows, index: 0, openedAt: performance.now() };
    this.showQuizChoice();
  }

  showQuizChoice() {
    this.quiz.rows.forEach((row, i) => row.box.setStrokeStyle(i === this.quiz.index ? 5 : 3, i === this.quiz.index ? 0xffd23f : 0x90a4ae));
  }

  updateQuiz() {
    const quiz = this.quiz;
    const c = quiz.player.controls;
    if (c.justPressed('up')) quiz.index = (quiz.index + 2) % 3;
    if (c.justPressed('down')) quiz.index = (quiz.index + 1) % 3;
    this.showQuizChoice();
    if (performance.now() - quiz.openedAt > 500 && (c.justPressed('jump') || c.justPressed('attack'))) this.answerQuiz(quiz.index);
  }

  answerQuiz(index) {
    const quiz = this.quiz;
    if (!quiz) return;
    const right = quiz.rows[index].right;
    for (const part of quiz.parts) part.destroy();
    this.quiz = null;
    this.unfreezeWorld();
    const message = this.bigMessage(t(right ? 'quiz.right' : 'quiz.wrong'), right ? '#b9f6ca' : '#ff8a80').setScale(0.7);
    this.time.delayedCall(1800, () => message.destroy());
    if (!right) {
      audio.play('error');
      this.quizReadyAt = this.time.now + 3000; // step away and come back to try another question
      return;
    }
    this.quizDone = true;
    audio.play('key');
    this.statue.clear();
    drawStatue(this.statue, STATUE.x, STATUE.y, true);
    // The secret room's bolts pour out of the door
    for (let i = 0; i < SECRET_BOLTS; i++) {
      const angle = Math.PI * (0.15 + (0.7 * i) / (SECRET_BOLTS - 1));
      const x = STATUE.x - Math.cos(angle) * 110;
      const y = STATUE.y - 30 - Math.sin(angle) * 90;
      const bolt = this.bolts.create(STATUE.x, STATUE.y - 30, 'bolt');
      this.tweens.add({ targets: bolt, x, y, duration: 500, delay: i * 40, ease: 'Back.easeOut', onUpdate: () => bolt.body.updateFromGameObject() });
    }
  }

  // ---------- Every frame ----------

  update(time, delta) {
    if (this.quiz) {
      this.updateQuiz();
      return;
    }
    const playing = !this.won && !this.tip && !this.cutscene && !this.dancing;
    if (playing) this.updateVines(delta);
    super.update(time, delta);
    if (!playing) return;
    this.updateLaunches(delta);
    this.checkStatue();
  }

  // ---------- Dark Ultra Capybara: purple fire, don't touch! ----------

  createBoss() {
    this.createCopy(COPY_HOME.x);
    this.copyAura = this.add.image(COPY_HOME.x, -200, 'aura').setTint(COPY_FIRE).setScale(1.4).setDepth(1.5).setVisible(false);
    this.tweens.add({ targets: this.copyAura, alpha: 0.6, scale: 1.55, duration: 300, yoyo: true, repeat: -1 });
  }

  bossEntrance() {
    this.beamDownCopy(COPY_HOME.x, FLOOR);
    this.copyAura.setVisible(true);
    this.tweens.add({ targets: this.templeLight, fillAlpha: 0.25, duration: 1500 });
  }

  // Purple fireballs along the floor, a charge, or a jump at you
  bossAction() {
    const target = this.nearestPlayer(this.boss.x);
    const dir = target.x < this.boss.x ? -1 : 1;
    const action = Phaser.Math.RND.pick(['fire', 'fire', 'charge', 'jump']);
    if (action === 'fire') {
      audio.play('fireBreath');
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 200, () => {
          if (!this.bossHittable()) return;
          this.enemyShoot(this.boss.x + dir * 50, FLOOR - 20, dir * this.settings.enemyShotSpeed, 0, 'fireball').setTint(COPY_FIRE).setScale(0.7);
        });
      }
    } else if (action === 'charge') {
      this.boss.setVelocityX(dir * 380);
    } else if (this.boss.body.blocked.down) {
      this.boss.setVelocity(dir * Math.min(Math.abs(target.x - this.boss.x), 360), -650);
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.setFlipX(this.nearestPlayer(boss.x).x < boss.x);
    if (boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.95);
    this.animateCopy();
    this.copyAura.setPosition(boss.x, boss.y + 8);
    this.templeLight.setPosition(boss.x, boss.y);
  }

  // Its fire burns: jumping on it hurts you instead of it
  stomp(target, player = this.player) {
    if (target === this.boss) {
      this.hurt(this.boss.x, player);
      return;
    }
    super.stomp(target, player);
  }

  defeatBoss() {
    this.tweens.killTweensOf(this.copyAura);
    this.tweens.add({ targets: [this.copyAura], alpha: 0, duration: 500 });
    this.tweens.add({ targets: this.templeLight, fillAlpha: 0, duration: 800 });
    super.defeatBoss();
  }
}
