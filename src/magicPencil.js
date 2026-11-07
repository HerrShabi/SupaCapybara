import Phaser from 'phaser';
import { t } from './i18n.js';
import { audio } from './audio.js';
import { createDoodleBombTexture, createDoodlePencilTextures, PENCIL_DRAWINGS, pen, PAPER } from './art/doodle.js';

// THE MAGIC PENCIL (the prize from the Drawings World, save.magicPencil): press E (✏️ on touch, right stick
// on a controller) in a side-scrolling level. The game pauses and you PICK what to draw (◀ ▶ + jump, or tap):
//   💣 bomb: drops next to you and explodes: beats bad guys and hurts the boss around it, never you
//   🌈 rainbow bridge: a bridge in front of your feet (over a gap!) for a while
//   🚀 rocket: blasts you up high
//   🌪️ tornado: sweeps forward and blows every bad guy it touches away
// Then trace its dotted outline with your finger or mouse (or hold JUMP/ATTACK and the pencil draws by itself).
// SideScrollerScene makes one (this.magicPencil), calls open(), update() while it's open, afterPlayers() every
// frame, and shows `status` in the HUD.

const WAIT_MS = 20000; // between drawings
const DONE_AT = 0.85; // how much of the outline you need to trace
const DOT_REACH = 26;
const BOX = { x: 380, y: 150 }; // where the 200x200 drawing box is on the screen
const CHOICES = ['bomb', 'bridge', 'rocket', 'tornado'];

const BLAST_RADIUS = 300;
const BLAST_DAMAGE = 4;
const BRIDGE_LENGTH = 440;
const BRIDGE_MS = 10000;
const ROCKET_MS = 900;
const ROCKET_SPEED = { x: 260, y: -560 };
const TORNADO_DISTANCE = 700;
const TORNADO_MS = 1600;
const TORNADO_DAMAGE = 3;

export class MagicPencil {
  constructor(scene) {
    this.scene = scene;
    this.readyAt = 0;
    this.drawing = null;
    this.rocket = null;
    createDoodleBombTexture(scene);
    createDoodlePencilTextures(scene);
  }

  get status() {
    const left = this.readyAt - this.scene.time.now;
    return left > 0 ? `E = ✏️ ${t('game.wait', { seconds: Math.ceil(left / 1000) })}` : `E = ✏️ ${t('game.ready')}`;
  }

  // ---------- Step 1: pick what to draw ----------

  open() {
    const scene = this.scene;
    if (this.drawing || scene.time.now < this.readyAt) return;
    scene.freezeWorld();
    audio.play('click');
    const parts = [];
    const ui = (object) => parts.push(object.setScrollFactor(0).setDepth(40)) && object;
    ui(scene.add.rectangle(480, 270, 960, 540, 0x000000, 0.45));
    ui(scene.add.rectangle(480, 260, 520, 360, PAPER).setStrokeStyle(4, 0x1a237e));
    ui(scene.add.text(480, 104, t('pencil.pick'), { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#1a237e' }).setOrigin(0.5));
    this.addClose(ui, 720);
    const cards = CHOICES.map((id, i) => {
      const x = 480 + (i - 1.5) * 118;
      const card = ui(scene.add.rectangle(x, 250, 104, 150, 0xffffff).setStrokeStyle(3, 0x90caf9));
      card.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.choose(id));
      ui(scene.add.text(x, 228, PENCIL_DRAWINGS[id].icon, { fontSize: '44px' }).setOrigin(0.5));
      const name = ui(scene.add.text(x, 290, t(`pencil.name.${id}`), { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#1a237e', align: 'center', wordWrap: { width: 96 } }).setOrigin(0.5));
      name.setScale(Math.min(1, 96 / name.width));
      return card;
    });
    ui(scene.add.text(480, 400, t('pencil.pickHelp'), { fontFamily: 'Arial', fontSize: '13px', color: '#455a64', align: 'center', wordWrap: { width: 480 } }).setOrigin(0.5));
    this.drawing = { step: 'pick', parts, cards, index: 0, openedAt: performance.now() };
    this.showPick();
  }

  addClose(ui, x) {
    const close = ui(this.scene.add.text(x, 100, '✕', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#1a237e' }).setOrigin(0.5));
    close.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish(false));
  }

  showPick() {
    const drawing = this.drawing;
    drawing.cards.forEach((card, i) => card.setStrokeStyle(i === drawing.index ? 6 : 3, i === drawing.index ? 0xffa000 : 0x90caf9));
  }

  // ---------- Step 2: trace it ----------

  choose(id) {
    const scene = this.scene;
    for (const part of this.drawing.parts) part.destroy();
    audio.play('click');
    const parts = [];
    const ui = (object) => parts.push(object.setScrollFactor(0).setDepth(40)) && object;
    ui(scene.add.rectangle(480, 270, 960, 540, 0x000000, 0.45));
    ui(scene.add.rectangle(480, 260, 380, 360, PAPER).setStrokeStyle(4, 0x1a237e));
    const title = ui(scene.add.text(470, 104, t('pencil.draw', { thing: `${t(`pencil.name.${id}`)} ${PENCIL_DRAWINGS[id].icon}` }), { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#1a237e' }).setOrigin(0.5));
    title.setScale(Math.min(1, 300 / title.width));
    ui(scene.add.text(480, 418, t('pencil.help'), { fontFamily: 'Arial', fontSize: '13px', color: '#455a64', align: 'center', wordWrap: { width: 340 } }).setOrigin(0.5));
    this.addClose(ui, 650);
    const dots = PENCIL_DRAWINGS[id].trace.map(([x, y]) => ({ x: BOX.x + x, y: BOX.y + y, done: false, image: ui(scene.add.circle(BOX.x + x, BOX.y + y, 5, 0x9e9e9e)) }));
    const ink = ui(scene.add.graphics());
    this.drawing = { step: 'trace', id, parts, dots, ink, last: null, autoAt: 0, openedAt: performance.now() };

    // Drawing with a finger or the mouse
    this.onPointer = (pointer) => {
      const drawing = this.drawing;
      if (!drawing || drawing.step !== 'trace') return;
      if (!pointer.isDown) {
        drawing.last = null;
        return;
      }
      const point = { x: pointer.x, y: pointer.y };
      if (drawing.last) pen(drawing.ink, [[drawing.last.x, drawing.last.y], [point.x, point.y]], { width: 4, wobble: 0.6 });
      drawing.last = point;
      for (const dot of drawing.dots) {
        if (!dot.done && Phaser.Math.Distance.Between(point.x, point.y, dot.x, dot.y) < DOT_REACH) this.tick(dot);
      }
      this.checkDone();
    };
    scene.input.on('pointermove', this.onPointer);
    scene.input.on('pointerdown', this.onPointer);
    scene.input.on('pointerup', this.onPointer);
  }

  tick(dot) {
    dot.done = true;
    dot.image.setFillStyle(0x1a237e).setRadius(6);
  }

  checkDone() {
    const drawing = this.drawing;
    if (!drawing || drawing.step !== 'trace') return;
    const done = drawing.dots.filter((dot) => dot.done).length;
    if (done >= drawing.dots.length * DONE_AT) this.finish(true);
  }

  // While it's open (the game is paused): keys and controller. Picking: ◀ ▶ and JUMP/ATTACK.
  // Tracing: hold JUMP or ATTACK and the pencil draws by itself.
  update() {
    const drawing = this.drawing;
    const c = this.scene.player.controls;
    const now = performance.now();
    if (now - drawing.openedAt < 300) return; // (the key that opened it)
    if (drawing.step === 'pick') {
      if (c.justPressed('left')) drawing.index = (drawing.index + CHOICES.length - 1) % CHOICES.length;
      if (c.justPressed('right')) drawing.index = (drawing.index + 1) % CHOICES.length;
      this.showPick();
      if (c.justPressed('jump') || c.justPressed('attack')) {
        this.choose(CHOICES[drawing.index]);
        this.drawing.waitForRelease = true;
      }
      return;
    }
    // (use up the presses here, so the hero doesn't jump the moment the game starts again)
    c.justPressed('jump');
    c.justPressed('attack');
    const holding = c.isDown('jump') || c.isDown('attack');
    if (drawing.waitForRelease) {
      if (!holding) drawing.waitForRelease = false;
      return;
    }
    if (!holding || now < drawing.autoAt) return;
    drawing.autoAt = now + 45;
    const index = drawing.dots.findIndex((dot) => !dot.done);
    if (index < 0) return;
    const dot = drawing.dots[index];
    const before = drawing.dots[index - 1];
    if (before) pen(drawing.ink, [[before.x, before.y], [dot.x, dot.y]], { width: 4, wobble: 0.6 });
    this.tick(dot);
    audio.play('click');
    this.checkDone();
  }

  finish(drawn) {
    const scene = this.scene;
    if (!this.drawing) return;
    const id = this.drawing.id;
    for (const part of this.drawing.parts) part.destroy();
    this.drawing = null;
    if (this.onPointer) {
      scene.input.off('pointermove', this.onPointer);
      scene.input.off('pointerdown', this.onPointer);
      scene.input.off('pointerup', this.onPointer);
    }
    scene.unfreezeWorld();
    if (!drawn) return;
    this.readyAt = scene.time.now + WAIT_MS;
    audio.play('buy');
    if (id === 'bomb') this.dropBomb();
    if (id === 'bridge') this.drawBridge();
    if (id === 'rocket') this.launchRocket();
    if (id === 'tornado') this.sendTornado();
  }

  // ---------- Step 3: the drawing comes to life ----------

  // 💣 A bomb drops next to you... BOOM!
  dropBomb() {
    const scene = this.scene;
    const player = scene.player;
    const x = player.x + player.facing * 70;
    const floor = scene.groundAt(x)?.top ?? player.y + 30;
    const bomb = scene.add.image(x, player.y - 60, 'doodle-bomb').setDepth(4);
    scene.tweens.add({ targets: bomb, y: floor - 30, duration: 350, ease: 'Bounce.easeOut' });
    scene.tweens.add({ targets: bomb, scale: 1.25, duration: 120, yoyo: true, repeat: 3, delay: 350 });
    scene.time.delayedCall(1100, () => {
      bomb.destroy();
      this.explode(x, floor - 30);
    });
  }

  explode(x, y) {
    const scene = this.scene;
    audio.play('explosion');
    scene.cameras.main.shake(400, 0.015);
    scene.safeUntil = Math.max(scene.safeUntil, scene.time.now + 600); // your own bomb never hurts you
    for (let i = 0; i < 3; i++) {
      const ring = scene.add.circle(x, y, 40, [0xffeb3b, 0xff9800, 0xe53935][i], 0.7).setDepth(5);
      scene.tweens.add({ targets: ring, scale: BLAST_RADIUS / 40, alpha: 0, duration: 500 + i * 120, onComplete: () => ring.destroy() });
    }
    this.popWord(t('pencil.boom'), x, y - 80);
    scene.blastAt(x, y, BLAST_RADIUS, BLAST_DAMAGE);
  }

  popWord(text, x, y) {
    const scene = this.scene;
    const word = scene.add.text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ff7043' }).setStroke('#1a237e', 8).setOrigin(0.5).setDepth(6);
    scene.tweens.add({ targets: word, y: y - 40, alpha: 0, duration: 1000, onComplete: () => word.destroy() });
  }

  // 🌈 A rainbow bridge right in front of your feet (you can walk on it, even over a gap)
  drawBridge() {
    const scene = this.scene;
    const player = scene.player;
    const y = player.sprite.body.bottom;
    const from = player.facing > 0 ? player.x - 20 : player.x + 20 - BRIDGE_LENGTH;
    const g = scene.add.graphics().setDepth(1.6);
    const colors = [0xe53935, 0xff9800, 0xffeb3b, 0x43a047, 0x1e88e5, 0x8e24aa];
    colors.forEach((color, i) => g.fillStyle(color, 0.9).fillRect(from, y + i * 4, BRIDGE_LENGTH, 4));
    pen(g, [[from, y], [from + BRIDGE_LENGTH, y]], { width: 2 });
    const zone = scene.add.zone(from, y, BRIDGE_LENGTH, 16).setOrigin(0, 0);
    scene.platforms.add(zone);
    zone.body.checkCollision.down = false;
    zone.body.checkCollision.left = false;
    zone.body.checkCollision.right = false;
    scene.tweens.add({ targets: g, alpha: 0.3, duration: 300, yoyo: true, repeat: 3, delay: BRIDGE_MS - 1800 });
    scene.time.delayedCall(BRIDGE_MS, () => {
      g.destroy();
      zone.destroy();
    });
  }

  // 🚀 A rocket under your feet blasts you up high
  launchRocket() {
    const scene = this.scene;
    const player = scene.player;
    audio.play('blastOff');
    const rocket = scene.add.image(player.x, player.y + 40, 'doodle-rocket').setDepth(1.8);
    this.rocket = { player, image: rocket, until: scene.time.now + ROCKET_MS, dir: player.facing };
  }

  // Every frame (after the heroes move): keep the rocket going
  afterPlayers() {
    const rocket = this.rocket;
    if (!rocket) return;
    const { player, image } = rocket;
    if (this.scene.time.now > rocket.until) {
      this.scene.tweens.add({ targets: image, y: image.y + 300, alpha: 0, angle: 90, duration: 700, onComplete: () => image.destroy() });
      this.rocket = null;
      return;
    }
    player.sprite.setVelocity(rocket.dir * ROCKET_SPEED.x, ROCKET_SPEED.y);
    image.setPosition(player.x, player.y + 44);
  }

  // 🌪️ A tornado sweeps forward and blows away every bad guy it touches
  sendTornado() {
    const scene = this.scene;
    const player = scene.player;
    const dir = player.facing;
    const floor = scene.groundAt(player.x)?.top ?? player.sprite.body.bottom;
    const tornado = scene.add.image(player.x + dir * 50, floor - 60, 'doodle-tornado').setDepth(4);
    audio.play('fly');
    let hitBoss = false;
    scene.tweens.add({ targets: tornado, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: -1 });
    scene.tweens.add({
      targets: tornado,
      x: tornado.x + dir * TORNADO_DISTANCE,
      duration: TORNADO_MS,
      onUpdate: () => {
        for (const badGuy of scene.badGuys.getChildren()) {
          if (badGuy.body?.enable && Math.abs(badGuy.x - tornado.x) < 60 && Math.abs(badGuy.y - tornado.y) < 110) {
            scene.defeat(badGuy);
            scene.tweens.add({ targets: badGuy, y: badGuy.y - 200, angle: 720, duration: 600 });
          }
        }
        if (!hitBoss && scene.bossHittable() && Math.abs(scene.boss.x - tornado.x) < 90) {
          hitBoss = true;
          scene.hitBoss(TORNADO_DAMAGE);
        }
      },
      onComplete: () => {
        scene.tweens.killTweensOf(tornado);
        scene.tweens.add({ targets: tornado, alpha: 0, duration: 300, onComplete: () => tornado.destroy() });
      },
    });
  }

  destroy() {
    if (this.drawing) this.finish(false);
    this.rocket?.image.destroy();
    this.rocket = null;
  }
}
