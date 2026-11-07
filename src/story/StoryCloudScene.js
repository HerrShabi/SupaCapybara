import Phaser from 'phaser';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { getCharacter } from '../characters.js';
import { SideScrollerScene, VIEW_WIDTH, VIEW_HEIGHT } from '../scenes/SideScrollerScene.js';
import { heroKey } from '../art/heroes.js';
import { touchButtonsFor } from '../touch.js';
import { drawComicBubble } from '../comicBubble.js';
import { loadSave } from '../save.js';
import { PLACES, STORY_START_HERO, freeFriend } from './story.js';

// THE BAD GUY KING, place 1: ☁️ the cloud kingdom. Jump across fluffy clouds high in the sky (fall and you
// lose a heart). At the end, Dark Supa Cat (an evil robot copy made by the King's machine) guards the real
// Supa Cat, who's a gold trophy. Beat the copy, the trophy breaks, and Supa Cat joins your team.
// You play with the 2 heroes you picked on the map (data.heroes) and switch between them with Q.

const PLACE = PLACES.find((p) => p.id === 'cloud');
const ARENA_START = 3840;
const LEVEL_WIDTH = ARENA_START + VIEW_WIDTH;
const FLOOR = 440;

// Solid clouds: [x, width, top]. The gaps are a long way down!
const GROUND = [
  [0, 600, 440],
  [720, 380, 400],
  [1220, 420, 430],
  [1760, 320, 380],
  [2200, 460, 420],
  [2780, 360, 390],
  [3260, 460, 440],
  [ARENA_START, VIEW_WIDTH, FLOOR],
];
// Little clouds you can jump up through: [x, top, width]
const PUFFS = [
  [380, 320, 130],
  [1000, 290, 110],
  [1450, 310, 120],
  [1980, 270, 120],
  [2450, 300, 130],
  [3000, 280, 120],
  [3500, 320, 120],
  [ARENA_START + 200, 320, 130],
  [ARENA_START + 560, 320, 130],
];
const BOLTS = [
  [250, 400, 3],
  [410, 280, 3],
  [880, 360, 2],
  [1470, 270, 2],
  [2000, 230, 3],
  [2470, 260, 3],
  [3020, 240, 2],
  [3400, 400, 2],
];
const SUNGLASSES = [
  [560, 400],
  [2100, 330],
  [3100, 320],
];
const APPLES = [1500, 2600, 3600];
const ROBOTS = [
  [760, 1060],
  [3300, 3550],
];

const TROPHY = { x: LEVEL_WIDTH - 130, y: FLOOR };
const COPY_HOME = { x: LEVEL_WIDTH - 300, y: FLOOR - 40 };
const COPY_TINT = 0x4a4a6a; // dark robot copy
const MINI_BOSS_HP = 0.6; // a mini boss has less health than a world boss

export class StoryCloudScene extends SideScrollerScene {
  constructor() {
    super('StoryCloud', {
      world: 'Cloud',
      titleKey: 'story.place.cloud',
      exitTo: 'Story',
      keyId: 'story-cloud',
      music: 'menu',
      bossName: 'story.darkCat',
      width: LEVEL_WIDTH,
      arenaStart: ARENA_START,
      start: { x: 100, y: 360 },
      arenaCheckpoint: { x: ARENA_START + 100, y: 360 },
      bolts: BOLTS,
      sunglasses: SUNGLASSES,
      apples: APPLES,
      robots: ROBOTS,
    });
  }

  create(data = {}) {
    this.heroes = data.heroes?.length ? data.heroes : [STORY_START_HERO];
    this.heroIndex = 0;
    // Touch buttons for both heroes' powers, plus 🔄 to switch
    const powerUps = loadSave().powerUps;
    const both = this.heroes.map((id) => touchButtonsFor(getCharacter(id), powerUps, false));
    this.extraTouchButtons = Object.fromEntries(Object.keys(both[0]).filter((key) => key !== 'attack').map((key) => [key, both.some((b) => b[key])]));
    if (this.heroes.length > 1) this.extraTouchButtons.swap = true;
    super.create({ ...data, hero: this.heroes[0] });
    this.settings = { ...this.settings, bossHp: Math.ceil(this.settings.bossHp * MINI_BOSS_HP) };

    if (this.heroes.length > 1) {
      this.switchText = this.add
        .text(16, 112, '', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' })
        .setStroke('#000000', 4)
        .setScrollFactor(0)
        .setDepth(10);
      this.showSwitchText();
      this.time.delayedCall(300, () => this.showTip('switch', this.player.x, this.player.y));
    }
  }

  groundAt(x) {
    const found = GROUND.find(([gx, width]) => x >= gx && x <= gx + width);
    return found && { x: found[0], width: found[1], top: found[2] };
  }

  // ---------- The sky and the clouds ----------

  createScenery() {
    this.cameras.main.setBackgroundColor(0x81d4fa);
    const sky = this.add.graphics().setScrollFactor(0);
    for (let i = 0; i < 10; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(0x4fc3f7),
        Phaser.Display.Color.IntegerToColor(0xf8bbd0),
        9,
        i,
      );
      sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      sky.fillRect(0, i * 54, VIEW_WIDTH, 54);
    }
    this.add.circle(800, 90, 46, 0xfff59d).setScrollFactor(0);
    // Far away clouds drifting slowly
    const far = this.add.graphics().setScrollFactor(0.2);
    far.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 14; i++) {
      const x = i * 260 + (i % 3) * 40;
      const y = 120 + (i % 4) * 50;
      far.fillCircle(x, y, 30);
      far.fillCircle(x + 35, y - 12, 38);
      far.fillCircle(x + 75, y, 28);
    }

    const clouds = this.add.graphics();
    this.solids = this.physics.add.staticGroup();
    for (const [x, width, top] of GROUND) {
      this.drawCloud(clouds, x, top, width, VIEW_HEIGHT - top + 40);
      this.solids.add(this.add.zone(x, top, width, VIEW_HEIGHT - top).setOrigin(0, 0));
    }
    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of PUFFS) {
      this.drawCloud(clouds, x, top, width, 22);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
    this.createTrophy();
  }

  // A fluffy cloud: a white block with bumps along the top and a soft blue shadow at the bottom.
  drawCloud(g, x, top, width, height) {
    g.fillStyle(0xb3e5fc);
    g.fillRoundedRect(x, top + 8, width, height, 14);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(x, top, width, Math.max(12, height - 14), 14);
    for (let bx = x + 16; bx < x + width - 10; bx += 34) g.fillCircle(bx, top + 4, 16 + ((bx / 34) % 2) * 5);
  }

  // Supa Cat as a gold trophy on a pedestal, waiting at the end of the level
  createTrophy() {
    const g = this.add.graphics();
    g.fillStyle(0xffa000);
    g.fillRect(TROPHY.x - 40, TROPHY.y - 38, 80, 10);
    g.fillStyle(0xffc107);
    g.fillRect(TROPHY.x - 28, TROPHY.y - 28, 56, 18);
    g.fillStyle(0xffa000);
    g.fillRect(TROPHY.x - 44, TROPHY.y - 10, 88, 10);
    this.pedestal = g;
    this.trophy = this.add.image(TROPHY.x, TROPHY.y - 62, `${heroKey(PLACE.friend, this.palette)}-idle`).setScale(1.5).setFlipX(true).setTint(0xffd54f);
    this.tweens.add({ targets: this.trophy, alpha: 0.8, duration: 700, yoyo: true, repeat: -1 });
  }

  updateScenery() {}

  // ---------- Switching heroes (Q) ----------

  update(time, delta) {
    const busy = this.won || this.tip || this.cutscene || this.dancing;
    if (!busy && this.heroes.length > 1 && this.player.controls.justPressed('swap')) this.switchHero();
    super.update(time, delta);
  }

  switchHero() {
    this.heroIndex = (this.heroIndex + 1) % this.heroes.length;
    const id = this.heroes[this.heroIndex];
    this.character = getCharacter(id);
    this.player.setCharacter(this.character, heroKey(id, this.palette), this.save.wearing?.[id] ?? null);
    audio.play('doubleJump');
    const puff = this.add.circle(this.player.x, this.player.y, 30, 0xffffff, 0.9).setDepth(4);
    this.tweens.add({ targets: puff, scale: 2.2, alpha: 0, duration: 350, onComplete: () => puff.destroy() });
    this.showSwitchText();
    const attack = t(`game.attack.${this.character.attack}`);
    this.hintText.setText(this.character.doubleJump ? `${attack}   ${t('game.jumpTwice')}` : attack);
  }

  showSwitchText() {
    const other = this.heroes[(this.heroIndex + 1) % this.heroes.length];
    this.switchText?.setText(`🔄 ${t('story.switchKey', { name: t(`name.${other}`) })}`);
  }

  // ---------- Dark Supa Cat (the mini boss) ----------

  createBoss() {
    const look = heroKey(PLACE.friend, this.palette);
    this.copyLook = look;
    this.boss = this.physics.add.sprite(COPY_HOME.x, -100, `${look}-idle`).setScale(2).setTint(COPY_TINT).setFlipX(true);
    this.boss.body.setSize(44, 34).setOffset(10, 13);
    this.boss.setCollideWorldBounds(true);
    this.boss.disableBody(true, true);
    this.physics.add.collider(this.boss, this.solids);
    this.physics.add.collider(this.boss, this.platforms);
    // Glowing red, like an evil robot (needs WebGL)
    this.boss.preFX?.addGlow(0xff1744, 4, 0, false, 0.1, 12);
  }

  // The King's machine beams the copy down from the sky, right in front of the trophy.
  bossEntrance() {
    audio.play('bossRoar');
    const beam = this.add.rectangle(COPY_HOME.x, 0, 60, FLOOR, 0xff1744, 0.35).setOrigin(0.5, 0).setDepth(1);
    this.tweens.add({ targets: beam, alpha: 0, duration: 1400, onComplete: () => beam.destroy() });
    this.boss.enableBody(true, COPY_HOME.x, 80, true, true);
    this.boss.setVelocity(0, 0);
    const words = this.add
      .text(COPY_HOME.x, 150, t('story.copyArrives'), { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ff5252', align: 'center' })
      .setStroke('#000000', 6)
      .setOrigin(0.5)
      .setDepth(10);
    this.time.delayedCall(2200, () => words.destroy());
    this.time.delayedCall(1300, () => this.startBossActions(0.8));
  }

  // Pounces at you, dashes at you, or shoots dark lasers.
  bossAction() {
    const target = this.nearestPlayer(this.boss.x);
    const dir = target.x < this.boss.x ? -1 : 1;
    const action = Phaser.Math.RND.pick(['pounce', 'dash', 'shoot', 'pounce']);
    if (action === 'pounce' && this.boss.body.blocked.down) {
      const distance = Math.min(Math.abs(target.x - this.boss.x), 400);
      this.boss.setVelocity(dir * Math.max(180, distance * 1.1), -620);
      audio.play('jump');
    } else if (action === 'dash') {
      this.boss.setVelocityX(dir * 420);
      audio.play('scratch');
    } else {
      for (const vy of [-90, 0, 90]) this.enemyShoot(this.boss.x + dir * 50, this.boss.y, dir * this.settings.enemyShotSpeed, vy);
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.setFlipX(this.nearestPlayer(boss.x).x < boss.x);
    if (boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.95);
    const moving = Math.abs(boss.body.velocity.x) > 40;
    if (!boss.body.blocked.down) boss.setTexture(`${this.copyLook}-jump`);
    else if (moving) boss.anims.play(`${this.copyLook}-run`, true);
    else {
      boss.anims.stop();
      boss.setTexture(`${this.copyLook}-idle`);
    }
  }

  pushBoss(dir) {
    this.boss.setVelocityX(dir * 300);
  }

  // ---------- Winning: the trophy breaks and Supa Cat is free ----------

  // (Called after the win dance, where the other worlds drop a key.)
  dropKey() {
    this.tweens.killTweensOf(this.trophy);
    this.trophy.setAlpha(1);
    audio.play('bossHit');
    this.tweens.add({
      targets: this.trophy,
      x: TROPHY.x + 4,
      duration: 50,
      yoyo: true,
      repeat: 9,
      onComplete: () => {
        audio.play('shatter');
        this.cameras.main.flash(300, 255, 236, 130);
        for (let i = 0; i < 12; i++) {
          const piece = this.add.rectangle(TROPHY.x, TROPHY.y - 62, 10, 10, 0xffc107).setDepth(3);
          this.tweens.add({ targets: piece, x: piece.x + Phaser.Math.Between(-120, 120), y: piece.y + Phaser.Math.Between(-120, 60), angle: 360, alpha: 0, duration: 700, onComplete: () => piece.destroy() });
        }
        this.trophy.clearTint();
        this.pedestal.destroy();
        this.tweens.add({ targets: this.trophy, y: TROPHY.y - 30, duration: 300, ease: 'Bounce.easeOut' });
        audio.play('key');
        const view = this.cameras.main.worldView;
        this.thanks = drawComicBubble(this, t('story.thanks', { name: t(`name.${PLACE.friend}`) }), { x: TROPHY.x, y: TROPHY.y - 30 }, view, -1);
        this.time.delayedCall(2600, () => this.win());
      },
    });
  }

  win() {
    if (this.won) return;
    this.won = true;
    for (const player of this.players) player.sprite.setVelocity(0, 0);
    for (const part of this.thanks ?? []) part.destroy();
    audio.play('win');
    freeFriend(this.save, PLACE);
    const name = t(`name.${PLACE.friend}`);
    this.bigMessage(t('story.friendFree', { name })).setScale(0.8);
    this.add
      .text(480, 290, [t('game.collected', { count: this.levelBolts }), t('story.joinsTeam', { name })].join('\n'), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#ffffff',
        align: 'center',
      })
      .setStroke('#000000', 6)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.time.delayedCall(3800, () => this.scene.start('Story'));
  }
}
