import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { CHARACTERS, POWER_UPS } from '../characters.js';
import { SideScrollerScene, VIEW_HEIGHT } from './SideScrollerScene.js';

// TRAINING: a lesson that teaches new players step by step, then a practice room with target dummies.
// You can't lose hearts here, every power-up is on, and H switches to any hero (even ones you haven't bought).

const WIDTH = 1920;
const FLOOR = 440;
const LEDGES = [
  [620, 330, 140],
  [1000, 270, 140],
  [1400, 330, 140],
];
const DUMMIES = [520, 860, 1250, 1650];
const DUMMY_BACK_MS = 1500;

export class TrainingScene extends SideScrollerScene {
  constructor() {
    super('Training', {
      world: 0,
      titleKey: 'menu.training',
      exitTo: 'Title',
      keyId: 'training',
      music: 'menu',
      bossName: 'menu.training',
      width: WIDTH,
      arenaStart: 99999, // no boss here
      start: { x: 120, y: 360 },
      arenaCheckpoint: { x: 120, y: 360 },
      bolts: [],
      sunglasses: [],
      apples: [],
      robots: [],
    });
  }

  create(data = {}) {
    this.createDummyTexture();
    super.create({ ...data, powerUps: POWER_UPS.filter((p) => p.ready).map((p) => p.id) });
    this.startX = this.player.x;
    this.dummiesHit = 0;
    this.stomped = false;

    DUMMIES.forEach((x) => this.addDummy(x));
    this.input.keyboard.on('keydown-H', () => this.nextHero());
    this.add
      .text(944, 110, t('train.heroButton'), { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', backgroundColor: '#1565c0', padding: { x: 10, y: 6 } })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.nextHero());

    this.lessonText = this.add
      .text(480, 160, '', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffffff', align: 'center' })
      .setStroke('#000000', 7)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.steps = this.lessonSteps();
    this.step = data.practice ? this.steps.length - 1 : 0;
    this.showStep();
  }

  // Each step: what to say, and how to know it's done.
  lessonSteps() {
    const p = () => this.player;
    const steps = [
      ['train.move', () => Math.abs(p().x - this.startX) > 150],
      ['train.jump', () => !p().sprite.body.blocked.down],
      ['train.attack', () => this.dummiesHit > 0],
      ['train.stomp', () => this.stomped],
    ];
    if (this.character.doubleJump) steps.push(['train.doubleJump', () => p().airJumpsLeft === 0 && !p().sprite.body.blocked.down]);
    if (this.character.invisibility) steps.push(['train.invisible', () => p().invisibleUntil > 0]);
    if (this.character.shadow) steps.push(['train.shadow', () => p().shadowUntil > 0]);
    if (this.character.attacks) steps.push(['train.swap', () => p().attackIndex > 0]);
    steps.push(['train.done', () => false]);
    return steps;
  }

  showStep() {
    const [key] = this.steps[this.step];
    this.lessonText.setText(t(key));
  }

  createDummyTexture() {
    if (this.textures.exists('dummy')) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x8d6e63);
    g.fillRect(28, 40, 8, 40); // pole
    g.fillStyle(0xd7b26b);
    g.fillRoundedRect(14, 14, 36, 34, 10); // straw body
    g.fillCircle(32, 10, 10); // head
    g.fillStyle(0xffffff);
    g.fillCircle(32, 31, 12);
    g.fillStyle(0xe53935);
    g.fillCircle(32, 31, 9);
    g.fillStyle(0xffffff);
    g.fillCircle(32, 31, 5);
    g.fillStyle(0xe53935);
    g.fillCircle(32, 31, 2);
    g.generateTexture('dummy', 64, 80);
    g.destroy();
  }

  addDummy(x) {
    const dummy = this.badGuys.create(x, FLOOR - 40, 'dummy');
    dummy.setData({ kind: 'dummy', passive: true, homeX: x });
  }

  // ---------- The gym ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x90caf9);
    const wall = this.add.graphics().setScrollFactor(0.4);
    wall.lineStyle(2, 0xbbdefb);
    for (let x = 0; x < WIDTH; x += 80) wall.lineBetween(x, 0, x, VIEW_HEIGHT);
    for (let y = 0; y < VIEW_HEIGHT; y += 80) wall.lineBetween(0, y, WIDTH, y);

    this.solids = this.physics.add.staticGroup();
    this.add.rectangle(0, FLOOR, WIDTH, VIEW_HEIGHT - FLOOR, 0x6d4c41).setOrigin(0, 0);
    this.add.rectangle(0, FLOOR, WIDTH, 10, 0xffb74d).setOrigin(0, 0);
    this.solids.add(this.add.zone(0, FLOOR, WIDTH, VIEW_HEIGHT - FLOOR).setOrigin(0, 0));

    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of LEDGES) {
      this.add.rectangle(x, top, width, 18, 0x1e88e5).setOrigin(0, 0).setStrokeStyle(3, 0x0d47a1);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
  }

  groundAt() {
    return { x: 0, width: WIDTH, top: FLOOR };
  }

  updateScenery() {
    if (!this.steps || this.step >= this.steps.length - 1) return;
    const [, done] = this.steps[this.step];
    if (!done()) return;
    this.step += 1;
    audio.play('crystal');
    const great = this.add
      .text(480, 220, t('train.great'), { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#76ff03' })
      .setStroke('#000000', 7)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.tweens.add({ targets: great, y: 190, alpha: 0, duration: 1000, onComplete: () => great.destroy() });
    this.showStep();
  }

  createBoss() {
    // No boss in training: an empty, switched-off one keeps the shared code happy.
    this.boss = this.physics.add.sprite(-500, -500, 'dummy').setVisible(false);
    this.boss.body.setAllowGravity(false);
    this.boss.disableBody(true, true);
  }

  // ---------- Nothing bad happens in training ----------

  hurt() {}

  loseHeart() {
    return true;
  }

  addBolts() {}

  stomp(target, player) {
    this.stomped = true;
    super.stomp(target, player);
  }

  // Dummies pop, then come back after a moment.
  defeat(dummy) {
    if (!dummy.body.enable) return;
    this.dummiesHit += 1;
    const x = dummy.getData('homeX');
    super.defeat(dummy);
    this.time.delayedCall(DUMMY_BACK_MS, () => this.addDummy(x));
  }

  // H: try the next hero (every hero, even ones you haven't bought yet).
  nextHero() {
    const heroes = CHARACTERS.filter((c) => !c.secret || this.save.keys.includes(c.unlockKey)).map((c) => c.id);
    const next = heroes[(heroes.indexOf(this.character.id) + 1) % heroes.length];
    this.scene.restart({ hero: next, practice: true });
  }
}
