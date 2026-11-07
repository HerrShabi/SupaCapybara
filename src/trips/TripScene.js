import Phaser from 'phaser';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { loadSave, writeSave } from '../save.js';
import { Controls } from '../controls.js';
import { showTouchControls } from '../touch.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { createBoltTexture } from '../art/bolt.js';
import { createEffectTextures } from '../art/effects.js';
import { createHatTextures, hatAnchor } from '../art/hats.js';
import { startWorld, markTripSeen } from './worlds.js';
import { drawingMode, applySketch } from '../sketch.js';
import { createDoodleHeroTextures, createDoodleHatTextures, doodleHeroKey, doodleHatAnchor, DOODLE_HAT_PREFIX } from '../art/doodle.js';

// What every trip between worlds shares (see worlds.js): the hero, the controls (keys, controller, touch),
// the bolts you win or lose, the progress bar, skipping (ESC / ⏸ once you've seen it) and going on to the
// next world. A trip is started with { from, hero } and fills in buildTrip() and updateTrip(time, delta),
// then calls this.arrive() when it's over.
//
// RunnerTrip (below) is a trip where you run (or ride, or slide) to the right by yourself and only jump
// (and duck): the rainbow slide, the surf, the mine cart and the stairs are all runners with a different look.

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
const BOLT_VALUE = 5;
const OOPS_COST = 10; // what a mistake costs (you can't fail a trip)

export class TripScene extends Phaser.Scene {
  // titleKey: the trip's name in i18n.js. touch: which touch buttons it needs ({ left, right, down, attack }).
  constructor(key, { titleKey, touch = {} }) {
    super(key);
    this.titleKey = titleKey;
    this.touchButtons = touch;
  }

  create(data = {}) {
    this.from = data.from;
    this.next = data.from + 1;
    this.heroId = data.hero ?? 'supa-capybara';
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    this.palette = this.save.keys.includes('world3') ? this.save.palette ?? 0 : 0;
    createHeroTextures(this, this.palette);
    createBoltTexture(this);
    createEffectTextures(this);
    // DRAWING MODE: the drawn hero (and hat), and the notebook look
    this.sketched = drawingMode(this.save);
    if (this.sketched) {
      createDoodleHeroTextures(this);
      createDoodleHatTextures(this);
    }
    this.look = this.sketched ? doodleHeroKey(this.heroId) : heroKey(this.heroId, this.palette);
    this.tripBolts = 0;
    this.done = false;
    this.seenBefore = (this.save.tripsSeen ?? []).includes(this.from);
    this.controls = new Controls(this, 'solo', 0);

    this.buildTrip();
    this.cameras.main.resetPostPipeline();
    if (this.sketched) applySketch(this);
    this.createHud();
    this.input.keyboard.on('keydown-ESC', () => this.skip());
    this.input.keyboard.on('keydown-M', () => {
      this.save.muted = !this.save.muted;
      writeSave(this.save);
      audio.setMuted(this.save.muted);
    });
    if (this.save.touch) {
      const touch = showTouchControls(this.game.canvas.parentElement, { attack: '⚡', ...this.touchButtons }, { jump: t('touch.jump') });
      this.events.once('shutdown', () => touch.destroy());
    }
  }

  // A hat on the hero, if they wear one (follows a sprite every frame: call this.updateHat()).
  addHat(sprite) {
    const hat = this.save.wearing?.[this.heroId];
    if (!hat) return;
    createHatTextures(this);
    this.hatSprite = this.add.image(0, 0, `${this.sketched ? DOODLE_HAT_PREFIX : 'hat-'}${hat}`).setScale(sprite.scaleX).setOrigin(0.5, hat === 'shades' ? 0.5 : 1).setDepth(sprite.depth + 0.1);
    this.hatOf = sprite;
    this.hatId = hat;
  }

  updateHat() {
    if (!this.hatSprite) return;
    const sprite = this.hatOf;
    const anchor = (this.sketched ? doodleHatAnchor : hatAnchor)(this.heroId, this.hatId, sprite.scaleX);
    const facing = sprite.flipX ? -1 : 1;
    this.hatSprite.setPosition(sprite.x + anchor.x * facing, sprite.y + anchor.y * (sprite.scaleY / sprite.scaleX)).setFlipX(sprite.flipX).setVisible(sprite.visible);
  }

  createHud() {
    const hud = (object) => object.setScrollFactor(0).setDepth(20);
    hud(this.add.text(16, 14, t(this.titleKey), { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff' }).setStroke('#000000', 6));
    hud(this.add.text(16, 46, t('trip.toWorld', { number: this.next, name: t(`world.name${this.next}`) }), { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffd23f' }).setStroke('#000000', 4));
    hud(this.add.image(820, 30, 'bolt').setScale(1.1));
    this.boltText = hud(this.add.text(842, 30, '+0', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffd23f' }).setStroke('#000000', 6).setOrigin(0, 0.5));
    hud(this.add.rectangle(480, 76, 404, 14, 0x000000, 0.6).setStrokeStyle(2, 0xffffff));
    this.progressBar = hud(this.add.rectangle(280, 76, 0, 10, 0x76ff03).setOrigin(0, 0.5));
    if (this.seenBefore) hud(this.add.text(944, 524, t('trip.skip'), { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setStroke('#000000', 3).setOrigin(1, 1));
    hud(this.add.text(480, 524, t(`trip.help.${this.constructor.helpKey ?? 'runner'}`), { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setStroke('#000000', 3).setOrigin(0.5, 1));
  }

  setProgress(fraction) {
    this.progressBar.width = 400 * Phaser.Math.Clamp(fraction, 0, 1);
  }

  // +bolts (or -bolts for a mistake), with a little number floating up from (x, y)
  addTripBolts(amount, x, y) {
    this.tripBolts = Math.max(-this.save.bolts, this.tripBolts + amount);
    this.boltText.setText(`${this.tripBolts >= 0 ? '+' : ''}${this.tripBolts}`);
    if (x === undefined) return;
    const text = this.add
      .text(x, y, `${amount > 0 ? '+' : ''}${amount}`, { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: amount > 0 ? '#ffd23f' : '#ff5252' })
      .setStroke('#000000', 5)
      .setOrigin(0.5)
      .setDepth(15);
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 800, onComplete: () => text.destroy() });
  }

  grabBolt(bolt) {
    if (!bolt.active) return;
    audio.play('bolt');
    this.addTripBolts(BOLT_VALUE, bolt.x, bolt.y - 20);
    bolt.destroy();
  }

  // A mistake (zapped, fell, bumped into something): a few bolts, a flash, and on you go
  oops(x, y) {
    audio.play('hurt');
    this.cameras.main.shake(150, 0.01);
    this.addTripBolts(-OOPS_COST, x, y);
  }

  skip() {
    if (!this.seenBefore || this.done) return;
    this.finish();
  }

  // The trip is over: a big message, then the next world
  arrive(messageKey = 'trip.arrived') {
    if (this.done) return;
    this.done = true;
    audio.play('win');
    this.add
      .text(480, 220, t(messageKey, { number: this.next }), { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffd23f' })
      .setStroke('#000000', 9)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
    this.time.delayedCall(2200, () => this.finish());
  }

  finish() {
    this.done = true;
    this.save.bolts = Math.max(0, this.save.bolts + this.tripBolts);
    markTripSeen(this.save, this.from);
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(450, () => startWorld(this, this.next, this.heroId));
  }

  update(time, delta) {
    if (this.done) return;
    this.updateTrip(time, delta);
  }
}

// Rocks, logs and wooden beams for the runner trips
function createTripTextures(scene) {
  const make = (key, width, height, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  };
  make('trip-rock', 48, 42, (g) => {
    g.fillStyle(0x616161).fillEllipse(24, 24, 46, 36);
    g.fillStyle(0x9e9e9e).fillEllipse(18, 18, 22, 14);
    g.fillStyle(0x424242).fillEllipse(32, 32, 14, 8);
  });
  make('trip-log', 84, 26, (g) => {
    g.fillStyle(0x6d4c41).fillRoundedRect(0, 2, 72, 22, 10);
    g.fillStyle(0xa1887f).fillEllipse(72, 13, 20, 24);
    g.lineStyle(2, 0x6d4c41).strokeEllipse(72, 13, 10, 12);
    g.lineStyle(2, 0x4e342e).lineBetween(10, 8, 50, 8).lineBetween(20, 18, 60, 18);
  });
  make('trip-beam', 76, 26, (g) => {
    g.fillStyle(0x795548).fillRect(0, 2, 76, 22);
    g.fillStyle(0x5d4037).fillRect(0, 2, 76, 5);
    g.fillStyle(0xffeb3b).fillTriangle(8, 24, 18, 24, 13, 14).fillTriangle(58, 24, 68, 24, 63, 14); // warning signs
  });
}

// ---------- Runner trips: auto-run to the right, jump (and duck) ----------

const RUN_SPEED = 300;
const JUMP_SPEED = 640;

export class RunnerTrip extends TripScene {
  // look: { sky: [top, bottom] colors, ground: color, groundTop: color, ride: 'board' | 'cart' | null }
  // course(): [{ x, width, top }] floors (gaps between = jump!), plus obstacles and bolts (see buildCourse)
  constructor(key, options) {
    super(key, { touch: { down: Boolean(options.duck) }, ...options });
    this.options = options;
  }

  buildTrip() {
    const { course } = this;
    this.courseLength = course.length;
    this.physics.world.setBounds(0, course.top ?? 0, course.length + 400, VIEW_HEIGHT - (course.top ?? 0) + 200);
    this.cameras.main.setBounds(0, course.top ?? 0, course.length + 400, VIEW_HEIGHT - (course.top ?? 0));
    this.drawBackground();

    this.floors = this.physics.add.staticGroup();
    const g = this.add.graphics().setDepth(2);
    for (const floor of course.floors) {
      this.drawFloor(g, floor);
      this.floors.add(this.add.zone(floor.x, floor.top, floor.width, 400).setOrigin(0, 0));
    }

    const ride = this.options.ride;
    this.hero = this.physics.add.sprite(120, course.floors[0].top - 60, `${this.look}-jump`).setScale(1.4).setDepth(5);
    this.hero.body.setSize(40, 34).setOffset(12, 13);
    this.physics.add.collider(this.hero, this.floors);
    this.addHat(this.hero);
    if (ride) this.rideImage = this.add.graphics().setDepth(4.9);
    this.cameras.main.startFollow(this.hero, true, 0.15, 0.15, -260, 40);

    // Things to jump over (block) or duck under (low)
    this.blocks = this.physics.add.staticGroup();
    this.lows = this.physics.add.staticGroup();
    for (const thing of course.things ?? []) {
      const image = this.drawThing(thing);
      (thing.low ? this.lows : this.blocks).add(image);
    }
    this.physics.add.overlap(this.hero, this.blocks, (hero, block) => this.bump(block));
    this.physics.add.overlap(this.hero, this.lows, (hero, low) => !this.ducking && this.bump(low));

    this.boltGroup = this.physics.add.staticGroup();
    for (const [x, y] of course.bolts ?? []) this.boltGroup.create(x, y, 'bolt');
    this.physics.add.overlap(this.hero, this.boltGroup, (hero, bolt) => this.grabBolt(bolt));
    this.startTrip?.();
  }

  bump(thing) {
    if (thing.getData('hit')) return;
    thing.setData('hit', true);
    thing.setAlpha(0.4);
    this.oops(this.hero.x, this.hero.y - 40);
    this.hero.setTint(0xff8a80);
    this.time.delayedCall(300, () => this.hero.clearTint());
  }

  updateTrip(time, delta) {
    const hero = this.hero;
    const body = hero.body;
    if (!this.arriving) body.setVelocityX(RUN_SPEED);
    const onGround = body.blocked.down;
    if (this.controls.justPressed('jump') && onGround) {
      body.setVelocityY(-JUMP_SPEED);
      audio.play('jump');
    }
    // Duck (mine cart): smaller, so low beams go over you
    const duck = this.options.duck && this.controls.isDown('down');
    if (duck !== this.ducking) {
      this.ducking = duck;
      hero.setScale(1.4, duck ? 0.8 : 1.4);
      body.setSize(40, duck ? 18 : 34).setOffset(12, duck ? 29 : 13);
    }
    hero.setTexture(`${this.look}-${onGround ? 'idle' : 'jump'}`);
    this.updateHat();
    this.drawRide();
    this.updateRunner?.(time, delta);

    // Fell down a gap: OOPS, and you're back on the next floor
    if (hero.y > VIEW_HEIGHT + 60) {
      this.oops(hero.x, VIEW_HEIGHT - 80);
      const next = this.course.floors.find((floor) => floor.x > hero.x - 40) ?? this.course.floors.at(-1);
      hero.body.reset(next.x + 40, next.top - 60);
    }
    this.setProgress(hero.x / this.courseLength);
    if (hero.x >= this.courseLength && !this.arriving) {
      this.arriving = true;
      body.setVelocityX(0);
      this.theEnd();
    }
  }

  // The board under a surfer, or the mine cart around the hero
  drawRide() {
    if (!this.rideImage) return;
    const g = this.rideImage.clear();
    const { x, y } = this.hero;
    if (this.options.ride === 'board') {
      g.fillStyle(0xffeb3b).fillRoundedRect(x - 46, y + 20, 92, 12, 6);
      g.fillStyle(0xe53935).fillRect(x - 30, y + 24, 60, 4);
    } else if (this.options.ride === 'cart') {
      g.fillStyle(0x6d4c41).fillRect(x - 40, y + 4, 80, 30);
      g.fillStyle(0x4e342e).fillRect(x - 40, y + 4, 80, 6);
      g.fillStyle(0x263238).fillCircle(x - 24, y + 36, 9).fillCircle(x + 24, y + 36, 9);
    }
  }

  // ---------- Each runner draws its own world (override these) ----------

  drawBackground() {
    const [top, bottom] = this.options.sky;
    const sky = this.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.IntegerToColor(top), Phaser.Display.Color.IntegerToColor(bottom), 9, i);
      sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b)).fillRect(0, i * 54, VIEW_WIDTH, 54);
    }
  }

  drawFloor(g, floor) {
    g.fillStyle(this.options.ground).fillRect(floor.x, floor.top, floor.width, VIEW_HEIGHT - floor.top + 400);
    g.fillStyle(this.options.groundTop).fillRect(floor.x, floor.top, floor.width, 10);
  }

  // A rock or log to jump over, or a low beam to duck under. Returns a physics-friendly game object.
  // thing: { x, y, kind: 'rock' | 'log' | 'beam' } (a beam is low: duck under it)
  drawThing(thing) {
    createTripTextures(this);
    return this.add.image(thing.x, thing.y, `trip-${thing.low ? 'beam' : thing.kind ?? 'rock'}`).setDepth(3);
  }

  theEnd() {
    this.arrive();
  }
}
