import Phaser from 'phaser';
import { Player } from '../Player.js';
import { getCharacter } from '../characters.js';
import { loadSave, writeSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { getDifficulty, BAD_GUY_REWARD, BOSS_REWARD } from '../difficulty.js';
import { audio } from '../audio.js';
import { showTouchControls, showTwoPlayerTouch, touchButtonsFor } from '../touch.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { createEffectTextures, createShieldTexture, createBubbleTexture, createPowerTextures } from '../art/effects.js';
import { createBoltTexture } from '../art/bolt.js';
import { createSunglassesTexture, createAppleTexture, createRobotTexture, createFireBadGuyTextures } from '../art/badGuys.js';
import { createItemTextures } from '../art/items.js';

// Everything the side-scrolling worlds (1 and 3) share: the hero, hearts, bolts, bad guys,
// getting hurt, the boss health bar, the key and winning.
//
// A world passes its layout to super() and fills in these:
//   createScenery()    make this.solids (ground you stand on) and this.platforms (jump-through ledges); optional this.movers
//   updateScenery(time, delta)
//   createBoss()       make this.boss (a physics sprite, disabled until the fight)
//   bossEntrance()     the boss shows up; call this.startBossActions() when the fight should begin
//   bossAction()       one attack, on a timer
//   updateBoss()       every frame during the fight
//   afterWin()         what happens after the key message (World 1 launches a rocket)

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

const BURN_EVERY_MS = 300; // how often a fire aura or the Mecha suit hurts something touching it
const STOMP_SAFE_MS = 250; // after bouncing off a head, touching that bad guy can't hurt you
const STOMP_REACH = 18; // how far into the top of a bad guy your feet can be and still count as a stomp
const BUBBLE_PUSH = 150; // how far the Shield bubble bounces a bad guy
const ROBOT_SPEED = 80;
const KNIGHT_SPEED = 90;
const KNIGHT_THROW_MS = 3500; // how often a knight throws a TNT bolt (slower on easier difficulties)
const MAX_TNT_BOLTS = 6;

export class SideScrollerScene extends Phaser.Scene {
  // level: { world, titleKey, exitTo, keyId, music, bossName, width, arenaStart, start, arenaCheckpoint, bolts, sunglasses, apples, robots, fallY,
  //          fire (fire versions of the bad guys), knights: [[fromX, toX, y]], bossRushNext (scene key of the next Boss Rush fight) }
  //
  // Boss Rush (a secret): start the scene with { bossRush: true, hearts }. You start right at the boss,
  // your hearts carry over from fight to fight, and losing them all is game over.
  //
  // 2 PLAYERS TEAM: start the scene with { team: { heroes: [hero1, hero2] } }. Both heroes share the hearts,
  // the camera follows them both, and power-ups are off. this.player is always player 1; this.players has everyone.
  constructor(key, level) {
    super(key);
    this.level = level;
  }

  create(data = {}) {
    this.bossRush = Boolean(data.bossRush);
    this.team = data.team ?? null;
    this.save = loadSave();
    // Secret colors only count once they're unlocked (by beating World 3)
    this.palette = this.save.keys.includes('world3') ? this.save.palette ?? 0 : 0;
    createHeroTextures(this, this.palette);
    createEffectTextures(this);
    createPowerTextures(this);
    createItemTextures(this);
    createShieldTexture(this);
    createBubbleTexture(this);
    setLanguage(this.save.language);
    const heroes = this.team ? this.team.heroes : [data.hero ?? this.save.selected];
    // Power-ups: yours, none for two players, or any list the scene is started with (Training lets you try them all)
    this.powerUps = data.powerUps ?? (this.team ? [] : this.save.powerUps);
    this.exitScene = this.team ? 'Title' : this.level.exitTo ?? 'Menu';
    this.character = getCharacter(heroes[0]);
    this.settings = getDifficulty(this.save.difficulty);
    this.won = false;
    this.hearts = data.hearts ?? this.settings.hearts;
    this.safeUntil = 0;
    this.checkpoint = this.bossRush ? this.level.arenaCheckpoint : this.level.start;
    this.bossStarted = false;
    this.levelBolts = 0;

    this.createScenery();

    const { width } = this.level;
    const start = this.checkpoint;
    this.players = heroes.map(
      (id, i) =>
        new Player(this, getCharacter(id), start.x + i * 60, start.y, {
          powerUps: this.powerUps,
          look: heroKey(id, this.palette),
          scheme: this.team ? `p${i + 1}` : 'solo',
          padIndex: i,
          hat: this.save.wearing?.[id] ?? null,
        }),
    );
    this.player = this.players[0];
    for (const player of this.players) {
      this.physics.add.collider(player.sprite, this.solids);
      this.physics.add.collider(player.sprite, this.platforms);
      if (this.movers) this.physics.add.collider(player.sprite, this.movers);
      this.physics.add.collider(player.lasers, this.solids, (laser) => laser.destroy());
    }

    this.createBolts();
    this.createBadGuys();
    this.createEnemyShots();
    this.createBoss();
    this.setUpBossTouches();
    this.createBubbleBounces();

    this.physics.world.setBounds(0, 0, width, VIEW_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false); // no floor: you can fall down holes
    for (const player of this.players) player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, width, VIEW_HEIGHT);
    // With two players, the camera follows the point between them.
    this.cameraTarget = this.team ? this.add.zone(start.x, start.y, 1, 1) : this.player.sprite;
    this.cameras.main.startFollow(this.cameraTarget, true, 0.1, 0.1);
    if (this.team) {
      this.playerTags = this.players.map((player, i) =>
        this.add.text(0, 0, `P${i + 1}`, { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: i ? '#4fc3f7' : '#ffd23f' }).setStroke('#000000', 4).setOrigin(0.5).setDepth(6),
      );
    }

    this.input.keyboard.on('keydown-ESC', () => this.scene.start(this.exitScene));
    this.input.keyboard.on('keydown-M', () => this.toggleSound());

    audio.setMuted(this.save.muted);
    audio.playMusic(this.level.music);

    if (this.save.touch) {
      const container = this.game.canvas.parentElement;
      const touch = this.team
        ? showTwoPlayerTouch(container)
        : showTouchControls(container, touchButtonsFor(this.character, this.powerUps, false), { jump: t('touch.jump') });
      this.events.once('shutdown', () => touch.destroy());
    }

    this.createHud();
  }

  // Override in a world: the ground piece under x, as { x, width, top }.
  groundAt() {
    return null;
  }

  // ---------- Screen display (hearts, bolts, powers, boss health) ----------

  createHud() {
    this.add
      .text(16, 16, this.bossRush ? t('menu.bossRush') : t(this.level.titleKey ?? `game.world${this.level.world}`), { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff' })
      .setStroke('#000000', 6)
      .setScrollFactor(0)
      .setDepth(10);

    this.heartIcons = [];
    for (let i = 0; i < this.settings.hearts; i++) {
      this.heartIcons.push(this.add.image(32 + i * 36, 72, 'heart').setScrollFactor(0).setDepth(10));
    }

    this.add
      .text(16, 92, t(`difficulty.${this.save.difficulty}`), { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' })
      .setStroke('#000000', 4)
      .setScrollFactor(0)
      .setDepth(10);

    const attack = t(`game.attack.${this.character.attack}`);
    const soloHint = this.character.doubleJump ? `${attack}   ${t('game.jumpTwice')}` : attack;
    const hint = this.team ? t('game.teamKeys') : soloHint;
    this.add
      .text(480, 30, hint, { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' })
      .setStroke('#000000', 4)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.powerText = this.add
      .text(480, 56, '', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#b9f6ca' })
      .setStroke('#000000', 4)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.add.image(800, 34, 'bolt').setScale(1.3).setScrollFactor(0).setDepth(10);
    this.boltText = this.add
      .text(822, 16, String(this.save.bolts), { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffd23f' })
      .setStroke('#000000', 6)
      .setScrollFactor(0)
      .setDepth(10);

    if (this.save.touch) return; // the touch buttons cover the bottom of the screen
    this.add
      .text(944, 524, `${t('game.sound')}   ${t('game.menu')}`, { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' })
      .setStroke('#000000', 3)
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(10);
  }

  toggleSound() {
    this.save.muted = !this.save.muted;
    writeSave(this.save);
    audio.setMuted(this.save.muted);
  }

  updateHearts() {
    this.heartIcons.forEach((icon, i) => icon.setAlpha(i < this.hearts ? 1 : 0.2));
  }

  bigMessage(text, color = '#ffd23f') {
    return this.add
      .text(480, 200, text, { fontFamily: 'Arial Black, Arial', fontSize: '60px', color })
      .setStroke('#000000', 10)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
  }

  // ---------- Bolts ----------

  createBolts() {
    createBoltTexture(this);
    this.bolts = this.physics.add.staticGroup();
    for (const [x, y, count] of this.level.bolts) {
      for (let i = 0; i < count; i++) {
        const bolt = this.bolts.create(x + i * 40, y, 'bolt');
        this.tweens.add({ targets: bolt, y: y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    for (const player of this.players) this.physics.add.overlap(player.sprite, this.bolts, (sprite, bolt) => this.collectBolt(bolt));
  }

  collectBolt(bolt) {
    bolt.disableBody(true, true);
    audio.play('bolt');
    this.addBolts(10);
  }

  // Adds ⚡ to the saved total (twice as much with the Double power-up). With `x, y`, a "+5" floats up from there.
  addBolts(base, x, y) {
    const amount = base * (this.save.powerUps.includes('double') ? 2 : 1);
    this.levelBolts += amount;
    this.save.bolts += amount;
    writeSave(this.save);
    this.boltText.setText(String(this.save.bolts));
    if (x === undefined) return;
    const reward = this.add
      .text(x, y, `+${amount} ⚡`, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffd23f' })
      .setStroke('#000000', 5)
      .setOrigin(0.5)
      .setDepth(6);
    this.tweens.add({ targets: reward, y: y - 50, alpha: 0, duration: 900, onComplete: () => reward.destroy() });
  }

  // ---------- Bad guys ----------

  createBadGuys() {
    createSunglassesTexture(this);
    createAppleTexture(this);
    createRobotTexture(this);
    createFireBadGuyTextures(this);
    this.badGuys = this.physics.add.group({ allowGravity: false, immovable: true });
    const fire = this.level.fire;
    this.shotTexture = fire ? 'fireball' : 'enemy-shot';

    this.level.sunglasses.forEach(([x, y], i) => {
      const sunglasses = this.badGuys.create(x, y, fire ? 'fire-sunglasses' : 'sunglasses').setScale(1.5);
      sunglasses.setData({ kind: 'sunglasses', baseY: y, phase: i });
    });

    const standingY = (x) => (this.groundAt(x)?.top ?? VIEW_HEIGHT) - 28 * 1.2;
    for (const x of this.level.apples) {
      const apple = this.badGuys.create(x, standingY(x), fire ? 'fire-apple' : 'apple').setScale(1.2);
      apple.setData({ kind: 'apple', nextShotAt: 0, shotEveryMs: 2000 });
    }

    for (const [fromX, toX] of this.level.robots) {
      const robot = this.badGuys.create(fromX, standingY(fromX), fire ? 'lava-robot' : 'robot').setScale(1.2);
      robot.setData({ kind: 'robot', nextShotAt: 0, shotEveryMs: 1600, fromX, toX, walkDir: 1 });
    }

    // Horned knights fly back and forth guarding bolts, and throw sneaky TNT bolts.
    for (const [fromX, toX, y] of this.level.knights ?? []) {
      const knight = this.badGuys.create(fromX, y, 'knight');
      knight.setData({ kind: 'knight', fromX, toX, baseY: y, walkDir: 1, nextThrowAt: 0, phase: fromX });
    }
    this.createTntBolts();

    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.badGuys, (sprite, badGuy) => this.touchedBadGuy(badGuy, player));
      this.physics.add.overlap(player.lasers, this.badGuys, (laser, badGuy) => {
        this.defeat(badGuy);
        laser.destroy();
        player.landedHit();
      });
    }
  }

  // Feet coming down onto the top of a bad guy = a stomp.
  isStomp(target, player = this.player) {
    const body = player.sprite.body;
    return body.velocity.y > 0 && body.bottom <= target.body.top + STOMP_REACH;
  }

  stomp(target, player = this.player) {
    player.stompBounce();
    audio.play('stomp');
    this.safeUntil = Math.max(this.safeUntil, this.time.now + STOMP_SAFE_MS);
    player.landedHit();
    if (target === this.boss) {
      this.hitBoss(1);
    } else {
      this.defeat(target);
    }
  }

  // Ultra Capybara's fire aura and the Mecha suit smash whatever they touch.
  smashesOnTouch(player) {
    return player.character.fireAura || player.mecha;
  }

  touchedBadGuy(badGuy, player = this.player) {
    if (this.isStomp(badGuy, player)) {
      this.stomp(badGuy, player);
    } else if (this.smashesOnTouch(player)) {
      this.defeat(badGuy);
    } else {
      this.hurt(badGuy.x, player);
    }
  }

  // The player closest to x (bad guys and bosses go after them).
  nearestPlayer(x) {
    return this.players.reduce((best, player) => (Math.abs(player.x - x) < Math.abs(best.x - x) ? player : best));
  }

  createEnemyShots() {
    this.enemyShots = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemyShots, this.solids, (shot) => shot.destroy());
    for (const player of this.players) {
      this.physics.add.overlap(player.shield, this.enemyShots, (shield, shot) => shot.destroy());
      this.physics.add.overlap(player.sprite, this.enemyShots, (sprite, shot) => {
        if (player.invisible) return; // shots fly right through Supa Chameleon
        this.hurt(shot.x, player);
        shot.destroy();
      });
    }
  }

  enemyShoot(x, y, vx, vy = 0, texture = this.shotTexture) {
    const shot = this.enemyShots.create(x, y, texture);
    if (texture === 'fireball' && texture === this.shotTexture) shot.setScale(0.7);
    audio.play('enemyShot');
    shot.setVelocity(vx, vy);
    shot.setFlipX(vx > 0);
    this.time.delayedCall(3000, () => shot.destroy());
    return shot;
  }

  updateBadGuys(delta) {
    const now = this.time.now;
    const frozen = now < (this.frozenUntil ?? 0);
    if (this.frozenUntil && !frozen) this.thaw();
    for (const badGuy of this.badGuys.getChildren()) {
      if (!badGuy.body.enable || badGuy.getData('passive') || frozen) continue; // frozen ones and training dummies just stand there
      const kind = badGuy.getData('kind');
      const beingBounced = now < (badGuy.getData('bouncedUntil') ?? 0);

      if (kind === 'sunglasses') {
        badGuy.y = badGuy.getData('baseY') - 15 + 15 * Math.cos((now / 2400) * Math.PI * 2 + badGuy.getData('phase'));
        continue;
      }

      if (kind === 'knight') {
        this.updateKnight(badGuy, now, delta, beingBounced);
        continue;
      }

      if (kind === 'robot' && !beingBounced) {
        let dir = badGuy.getData('walkDir');
        if (badGuy.x >= badGuy.getData('toX')) dir = -1;
        if (badGuy.x <= badGuy.getData('fromX')) dir = 1;
        badGuy.setData('walkDir', dir);
        badGuy.x += dir * ROBOT_SPEED * (delta / 1000);
      }

      const target = this.nearestPlayer(badGuy.x);
      if (target.invisible) continue; // they can't see you, so they don't shoot

      const dx = target.x - badGuy.x;
      if (kind === 'robot') badGuy.setFlipX(dx < 0); // always looks at you

      if (Math.abs(dx) > this.settings.enemySeeDistance) continue;
      if (!badGuy.getData('nextShotAt')) {
        // Just saw you: wait a moment before the first shot.
        badGuy.setData('nextShotAt', now + this.settings.enemyFirstShotMs);
      }
      if (now < badGuy.getData('nextShotAt')) continue;
      badGuy.setData('nextShotAt', now + badGuy.getData('shotEveryMs') * this.settings.enemyShotSlowdown);

      if (kind === 'apple') {
        // One blaster on each side: shoots both ways at once.
        this.enemyShoot(badGuy.x - 40, badGuy.y + 5, -this.settings.enemyShotSpeed);
        this.enemyShoot(badGuy.x + 40, badGuy.y + 5, this.settings.enemyShotSpeed);
      } else {
        const dir = dx < 0 ? -1 : 1;
        this.enemyShoot(badGuy.x + dir * 50, badGuy.y - 6, dir * this.settings.enemyShotSpeed);
      }
    }
  }

  updateKnight(knight, now, delta, beingBounced) {
    let dir = knight.getData('walkDir');
    if (!beingBounced) {
      if (knight.x >= knight.getData('toX')) dir = -1;
      if (knight.x <= knight.getData('fromX')) dir = 1;
      knight.setData('walkDir', dir);
      knight.x += dir * KNIGHT_SPEED * (delta / 1000);
    }
    knight.y = knight.getData('baseY') + 10 * Math.sin(now / 300 + knight.getData('phase'));
    knight.setFlipX(dir < 0);

    const target = this.nearestPlayer(knight.x);
    if (target.invisible || Math.abs(target.x - knight.x) > this.settings.enemySeeDistance) return;
    if (!knight.getData('nextThrowAt')) knight.setData('nextThrowAt', now + this.settings.enemyFirstShotMs);
    if (now < knight.getData('nextThrowAt') || this.tntBolts.countActive() >= MAX_TNT_BOLTS) return;
    knight.setData('nextThrowAt', now + KNIGHT_THROW_MS * this.settings.enemyShotSlowdown);
    const tnt = this.tntBolts.create(knight.x, knight.y + 20, 'tnt-bolt');
    tnt.setVelocity(Phaser.Math.Between(-80, 80), -150);
  }

  // TNT bolts look like normal bolts (except a tiny spark). Grab one and... BOOM: 1 heart.
  createTntBolts() {
    this.tntBolts = this.physics.add.group({ dragX: 300 });
    this.physics.add.collider(this.tntBolts, this.solids);
    this.physics.add.collider(this.tntBolts, this.platforms);
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.tntBolts, (sprite, tnt) => {
        const { x, y } = tnt;
        tnt.destroy();
        audio.play('tnt');
        const boom = this.add.circle(x, y, 20, 0xff6d00).setDepth(5);
        this.tweens.add({ targets: boom, scale: 4, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
        this.cameras.main.shake(250, 0.015);
        this.hurt(x, player);
      });
    }
  }

  // Scratch and tongue attacks: hit everything inside the area. Returns true if anything was hit.
  hitArea(area, damage) {
    let hitSomething = false;
    for (const badGuy of this.badGuys.getChildren()) {
      if (badGuy.body.enable && Phaser.Geom.Intersects.RectangleToRectangle(area, badGuy.getBounds())) {
        this.defeat(badGuy);
        hitSomething = true;
      }
    }
    if (this.bossHittable() && Phaser.Geom.Intersects.RectangleToRectangle(area, this.boss.getBounds())) {
      this.hitBoss(damage);
      hitSomething = true;
    }
    return hitSomething;
  }

  // For Bloodmoon Cat's moon: the closest bad guy (or the boss) to x, y.
  nearestTarget(x, y) {
    let best = null;
    let bestDistance = 700;
    const targets = this.badGuys.getChildren().filter((b) => b.body.enable);
    if (this.bossHittable()) targets.push(this.boss);
    for (const target of targets) {
      const distance = Phaser.Math.Distance.Between(x, y, target.x, target.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = target;
      }
    }
    return best;
  }

  // Freeze Ray: every bad guy freezes (icy blue, can't move or shoot); bosses only slow down.
  freezeBadGuys(ms) {
    this.frozenUntil = this.time.now + ms;
    this.bossSlowUntil = this.time.now + ms;
    this.cameras.main.flash(250, 180, 230, 255);
    for (const badGuy of this.badGuys.getChildren()) {
      if (badGuy.body.enable && !badGuy.getData('passive')) badGuy.setTint(0x80d8ff);
    }
    if (this.bossHittable()) this.boss.setTint(0x80d8ff);
  }

  thaw() {
    this.frozenUntil = 0;
    for (const badGuy of this.badGuys.getChildren()) badGuy.clearTint();
    if (this.boss?.active) this.boss.clearTint();
  }

  get bossSlowed() {
    return this.time.now < (this.bossSlowUntil ?? 0);
  }

  defeat(badGuy) {
    if (!badGuy.body.enable) return;
    badGuy.disableBody(true, false);
    const frozen = this.time.now < (this.frozenUntil ?? 0);
    if (frozen) {
      // A frozen bad guy SHATTERS into ice pieces, for double bolts
      audio.play('shatter');
      for (let i = 0; i < 8; i++) {
        const piece = this.add.rectangle(badGuy.x, badGuy.y, 8, 8, 0xb3e5fc).setDepth(5);
        this.tweens.add({ targets: piece, x: piece.x + Phaser.Math.Between(-60, 60), y: piece.y + Phaser.Math.Between(-60, 30), angle: 180, alpha: 0, duration: 500, onComplete: () => piece.destroy() });
      }
      this.addBolts(BAD_GUY_REWARD * 2, badGuy.x, badGuy.y - 30);
    } else {
      audio.play('pop');
      this.addBolts(BAD_GUY_REWARD, badGuy.x, badGuy.y - 30);
    }
    this.tweens.killTweensOf(badGuy);
    this.tweens.add({
      targets: badGuy,
      scale: 3,
      alpha: 0,
      angle: 180,
      duration: 300,
      onComplete: () => badGuy.destroy(),
    });
  }

  // ---------- Shield bubble: bad guys bounce off it ----------

  createBubbleBounces() {
    for (const player of this.players) {
      if (!player.shieldIsBubble) continue;
      this.physics.add.overlap(player.shield, this.badGuys, (shield, badGuy) => this.bounceAway(badGuy, player));
      this.physics.add.overlap(player.shield, this.boss, () => {
        if (!this.bossStarted || this.time.now < (this.boss.getData('bouncedUntil') ?? 0)) return;
        this.boss.setData('bouncedUntil', this.time.now + 500);
        this.pushBoss(this.boss.x < player.x ? -1 : 1);
      });
    }
  }

  // Override if a boss can't be pushed like a normal physics sprite.
  pushBoss(dir) {
    this.boss.setVelocity(dir * 400, -250);
  }

  bounceAway(badGuy, player = this.player) {
    const now = this.time.now;
    if (now < (badGuy.getData('bouncedUntil') ?? 0)) return;
    badGuy.setData('bouncedUntil', now + 300);
    audio.play('bounce');

    const dir = badGuy.x < player.x ? -1 : 1;
    let targetX = badGuy.x + dir * BUBBLE_PUSH;
    const ground = this.groundAt(badGuy.x);
    if (badGuy.getData('kind') !== 'sunglasses' && ground) {
      // Bad guys standing on the ground stay on that piece of ground.
      targetX = Phaser.Math.Clamp(targetX, ground.x + 30, ground.x + ground.width - 30);
    }
    this.tweens.add({ targets: badGuy, x: targetX, duration: 250, ease: 'Back.easeOut' });
  }

  // ---------- Getting hurt ----------

  // With two players, the hearts are shared: either one getting hit costs the team a heart.
  hurt(fromX, player = this.player) {
    if (this.won || player.invisible || player.unhurtable || this.time.now < this.safeUntil) return;
    audio.play('hurt');
    if (!this.loseHeart()) return;

    // Bounce away from whatever hit you, and blink while you're safe.
    const away = player.x < fromX ? -1 : 1;
    player.sprite.setVelocity(away * 150, -300);
    player.wasHurt();
    this.safeUntil = this.time.now + this.settings.hurtSafeMs;
    this.tweens.add({
      targets: player.sprite,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: this.settings.hurtSafeMs / 200 - 1,
      onComplete: () => player.restoreLook(),
    });
  }

  // Returns false if that was the last heart (then you start again at the checkpoint).
  loseHeart() {
    this.hearts -= 1;
    this.cameras.main.shake(150, 0.01);
    if (this.hearts > 0) {
      this.updateHearts();
      return true;
    }
    if (this.bossRush) {
      this.gameOver();
      return false;
    }
    this.hearts = this.settings.hearts;
    this.updateHearts();
    this.respawn();
    return false;
  }

  // Boss Rush only: out of hearts means it's over.
  gameOver() {
    this.won = true; // stops the level
    this.updateHearts();
    for (const player of this.players) player.sprite.setVisible(false).body.enable = false;
    audio.stopMusic();
    audio.play('fall');
    this.bigMessage(t('game.gameOver'), '#ff5252');
    this.time.delayedCall(3000, () => this.scene.start('Menu'));
  }

  respawn() {
    this.players.forEach((player, i) => player.respawnAt({ x: this.checkpoint.x + i * 60, y: this.checkpoint.y }));
    this.safeUntil = this.time.now + this.settings.hurtSafeMs;
    this.cameras.main.flash(200, 255, 255, 255);
  }

  // ---------- Boss ----------

  setUpBossTouches() {
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, this.boss, () => {
        if (!this.bossHittable()) return;
        if (this.isStomp(this.boss, player)) {
          this.stomp(this.boss, player);
        } else if (this.smashesOnTouch(player)) {
          this.burnBoss();
        } else {
          this.hurt(this.boss.x, player);
        }
      });
      this.physics.add.overlap(this.boss, player.lasers, (boss, laser) => {
        if (!this.bossHittable()) return;
        this.hitBoss(laser.getData('damage'));
        laser.destroy();
        player.landedHit();
      });
    }
  }

  bossHittable() {
    return this.bossStarted && this.boss.active && this.boss.body.enable;
  }

  burnBoss() {
    const now = this.time.now;
    if (now < (this.boss.getData('burnReadyAt') ?? 0)) return;
    this.boss.setData('burnReadyAt', now + BURN_EVERY_MS);
    this.hitBoss(1);
  }

  // Lock the door behind you, show the boss's name and health bar, and let the boss make an entrance.
  startBoss() {
    const { arenaStart, arenaCheckpoint, bossName } = this.level;
    this.bossStarted = true;
    this.checkpoint = arenaCheckpoint;

    const wall = this.add.zone(arenaStart - 30, 0, 30, VIEW_HEIGHT).setOrigin(0, 0);
    this.solids.add(wall);
    this.cameras.main.setBounds(arenaStart, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const title = this.bigMessage(`${t(bossName)}!`, '#ff5a3a');
    this.time.delayedCall(1500, () => title.destroy());

    this.add
      .text(480, 112, t(bossName), { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff' })
      .setStroke('#000000', 4)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.add.rectangle(480, 132, 404, 20, 0x000000).setScrollFactor(0).setDepth(10);
    this.bossBar = this.add.rectangle(280, 132, 400, 14, 0xff3a3a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10);
    this.boss.setData('hp', this.settings.bossHp);

    audio.playMusic('boss');
    this.bossEntrance();
  }

  startBossActions(delayFactor = 1) {
    audio.play('bossRoar');
    this.bossTimer = this.time.addEvent({
      delay: this.settings.bossActionMs * delayFactor,
      loop: true,
      callback: () => {
        if (this.players.every((player) => player.invisible)) return; // the boss can't find an invisible Supa Chameleon
        if (this.bossSlowed && Math.random() < 0.6) return; // slowed down by the Freeze Ray
        this.bossAction();
      },
    });
  }

  hitBoss(amount) {
    if (!this.bossHittable()) return;
    const hp = Math.max(0, this.boss.getData('hp') - amount);
    this.boss.setData('hp', hp);
    this.bossBar.width = (400 * hp) / this.settings.bossHp;
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.boss.clearTint());
    audio.play('bossHit');
    if (hp <= 0) this.defeatBoss();
  }

  defeatBoss() {
    this.bossTimer?.remove();
    this.boss.disableBody(true, false);
    this.tweens.killTweensOf(this.boss);
    this.enemyShots.clear(true, true);
    this.onBossDefeated?.();
    this.cameras.main.shake(600, 0.02);
    audio.stopMusic();
    audio.play('explosion');
    this.addBolts(BOSS_REWARD, this.boss.x, this.boss.y - 90);
    this.tweens.add({
      targets: this.boss,
      angle: 720,
      scale: 0,
      duration: 900,
      onComplete: () => {
        this.dropKey(this.boss.x);
        this.boss.destroy();
      },
    });
  }

  dropKey(x) {
    const floor = this.groundAt(x)?.top ?? VIEW_HEIGHT - 100;
    const key = this.physics.add.image(x, floor - 100, 'key');
    key.body.setAllowGravity(false);
    this.tweens.add({ targets: key, y: floor - 40, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const player of this.players) {
      this.physics.add.overlap(player.sprite, key, () => {
        if (!key.active) return;
        key.destroy();
        this.win();
      });
    }
  }

  win() {
    if (this.won) return;
    this.won = true;
    for (const player of this.players) player.sprite.setVelocity(0, 0);
    audio.play('key');
    this.time.delayedCall(400, () => audio.play('win'));

    if (this.bossRush) {
      // On to the next boss, with the hearts you have left
      const next = this.level.bossRushNext;
      this.bigMessage(t(next ? 'game.nextBoss' : 'game.bossRushDone'));
      this.time.delayedCall(2500, () => (next ? this.scene.start(next, { bossRush: true, hearts: this.hearts }) : this.scene.start('Menu')));
      return;
    }

    const firstTime = !this.save.keys.includes(this.level.keyId);
    this.firstTime = firstTime;
    if (firstTime) this.save.keys.push(this.level.keyId);
    writeSave(this.save);

    const title = this.bigMessage(t('game.gotKey')).setScale(0.85);
    const lines = [t('game.collected', { count: this.levelBolts }), ...this.winLines(firstTime)];
    const details = this.add
      .text(480, 290, lines.join('\n'), { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff', align: 'center' })
      .setStroke('#000000', 6)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.time.delayedCall(3000, () => {
      title.destroy();
      details.destroy();
      if (this.team) this.scene.start('Title');
      else this.afterWin();
    });
  }

  // Extra lines on the win screen. Override in a world.
  winLines() {
    return [];
  }

  afterWin() {
    this.scene.start('Menu');
  }

  // ---------- Every frame ----------

  update(time, delta) {
    this.updateScenery(time, delta);
    if (this.won) return;

    for (const player of this.players) player.update();
    this.powerText.setText(this.team ? '' : this.player.powerStatus);
    if (this.team) this.followTeam();

    // Fell down a hole: lose a heart and go back (with two players, next to the other one).
    for (const player of this.players) {
      if (player.y <= (this.level.fallY ?? VIEW_HEIGHT + 100)) continue;
      audio.play('fall');
      if (!this.loseHeart()) continue;
      const buddy = this.players.find((other) => other !== player && other.sprite.body.blocked.down);
      if (buddy) player.respawnAt({ x: buddy.x, y: buddy.y - 60 });
      else this.respawn();
    }

    this.updateBadGuys(delta);
    if (!this.bossStarted) {
      if (this.players.some((player) => player.x > this.level.arenaStart + 60)) {
        this.startBoss();
        // Bring everyone into the boss room
        this.players.forEach((player, i) => {
          if (player.x < this.level.arenaStart) player.respawnAt({ x: this.level.arenaCheckpoint.x + i * 60, y: this.level.arenaCheckpoint.y });
        });
      }
    } else if (this.boss.active && this.boss.body.enable) {
      this.updateBoss(time, delta);
    }
  }

  // Two players: the camera looks between them, and nobody can walk off the screen.
  followTeam() {
    const x = this.players.reduce((sum, player) => sum + player.x, 0) / this.players.length;
    const y = this.players.reduce((sum, player) => sum + player.y, 0) / this.players.length;
    this.cameraTarget.setPosition(x, y);
    const view = this.cameras.main.worldView;
    this.players.forEach((player, i) => {
      if (view.width > 0) player.sprite.x = Phaser.Math.Clamp(player.x, view.x + 30, view.right - 30);
      this.playerTags[i].setPosition(player.x, player.y - 55);
    });
  }

  // The x of whoever is furthest ahead (for things like the sky changing as you go).
  leadX() {
    return Math.max(...this.players.map((player) => player.x));
  }
}
