import Phaser from 'phaser';
import { goldify, ungoldify } from '../art/gold.js';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { getCharacter } from '../characters.js';
import { BOSS_REWARD, getDifficulty } from '../difficulty.js';
import { writeSave } from '../save.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../scenes/SideScrollerScene.js';
import { heroKey } from '../art/heroes.js';
import { createCrocKingTexture, createCastleTextures } from '../art/crocKing.js';
import { createVolcanoTextures } from '../art/volcano.js';
import { drawTemple } from '../art/jungle.js';
import { StoryLevelScene } from './StoryLevelScene.js';
import { PLACES, storyProgress } from './story.js';

// THE BAD GUY KING's throne room: the final fight (Ethan's round 9 design). Your whole team is here (Q switches).
// Phase 1: he flies around on his throne, firing the laser cannons and zapping the floor with his TROPHY ZAPPER.
//   Watch the yellow warning line! If the beam hits you, that hero turns into a trophy and you switch to the next.
//   If every hero is a trophy, the fight starts over.
// Phase 2 (half health): the throne breaks, he jumps off and fights on foot: chomping charges, tail spins,
//   stomps that send shockwaves, and still the zapper.
// The end: his zapper backfires and turns HIM into a trophy. Your friends break free. Then the ending movie.
// KING RUSH (data.rush): EXTREME, hearts carried over from the castle, and back to the title screen at the end.

const PLACE = PLACES.find((p) => p.id === 'castle');
const FLOOR = 440;
const KING_HP = 2; // times a normal boss's health: it's the finale!
const FLY_Y = [140, 200];
const ZAP_WARNING_MS = 900;
const ZAP_MS = 450;
const ZAP_WIDTH = 46;

export class StoryKingScene extends StoryLevelScene {
  constructor() {
    super(
      'StoryKing',
      {
        world: 'King',
        titleKey: 'story.throneRoom',
        rushTitleKey: 'menu.kingRush',
        keyId: 'story-king',
        bossName: 'story.kingName',
        width: VIEW_WIDTH,
        arenaStart: 0,
        start: { x: 120, y: 360 },
        arenaCheckpoint: { x: 120, y: 360 },
        bolts: [],
        sunglasses: [],
        apples: [],
        robots: [],
      },
      { place: PLACE, trophy: null },
    );
  }

  create(data = {}) {
    createCrocKingTexture(this);
    createCastleTextures(this);
    createVolcanoTextures(this);
    this.rush = Boolean(data.rush);
    // (Keep the starting team: trophies take heroes out of this.heroes, and "start over" brings them all back)
    this.startData = { ...data, heroes: [...(data.heroes?.length ? data.heroes : ['supa-capybara'])] };
    this.phase = 1;
    this.busy = false;
    this.trophies = [];
    this.stompingDown = false;
    super.create({ ...data, heroes: [...this.startData.heroes], bossRush: this.rush, difficulty: this.rush ? 'extreme' : data.difficulty });
    if (this.rush) this.exitScene = 'Title';
    this.settings = { ...this.settings, bossHp: getDifficulty(this.difficultyId).bossHp * KING_HP };
  }

  groundAt() {
    return { x: 0, width: VIEW_WIDTH, top: FLOOR };
  }

  createScenery() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    const room = this.add.graphics();
    drawTemple(room, 0, VIEW_WIDTH, FLOOR);
    // Red carpet and banners with a crocodile crown
    room.fillStyle(0xb71c1c).fillRect(0, FLOOR, VIEW_WIDTH, 14);
    for (const x of [140, 820]) {
      room.fillStyle(0x4a148c).fillRect(x - 40, 40, 80, 150);
      room.fillTriangle(x - 40, 190, x + 40, 190, x, 220);
      room.fillStyle(0xffc107).fillTriangle(x - 20, 110, x - 10, 80, x, 110).fillTriangle(x, 110, x + 10, 80, x + 20, 110).fillRect(x - 20, 106, 40, 10);
    }
    this.solids = this.physics.add.staticGroup();
    room.fillStyle(0x455a64).fillRect(0, FLOOR + 14, VIEW_WIDTH, VIEW_HEIGHT - FLOOR);
    this.solids.add(this.add.zone(0, FLOOR, VIEW_WIDTH, VIEW_HEIGHT - FLOOR).setOrigin(0, 0));
    this.platforms = this.physics.add.staticGroup();
    for (const [x, top, width] of [[60, 320, 150], [750, 320, 150], [400, 250, 160]]) {
      room.fillStyle(0x78909c).fillRect(x, top, width, 16);
      const zone = this.add.zone(x, top, width, 16).setOrigin(0, 0);
      this.platforms.add(zone);
      zone.body.checkCollision.down = false;
      zone.body.checkCollision.left = false;
      zone.body.checkCollision.right = false;
    }
    this.zapGraphics = this.add.graphics().setDepth(5);
  }

  updateScenery() {}

  // ---------- The King ----------

  createBoss() {
    this.boss = this.physics.add.sprite(VIEW_WIDTH - 200, -200, 'croc-king');
    this.boss.body.setAllowGravity(false);
    this.boss.body.setSize(150, 150).setOffset(35, 20);
    this.boss.disableBody(true, true);
    this.physics.add.collider(this.boss, this.solids, () => this.bossLanded());
  }

  bossEntrance() {
    this.boss.enableBody(true, VIEW_WIDTH + 200, FLY_Y[0], true, true);
    audio.play('bossRoar');
    this.busy = true;
    const words = this.say(t('story.king.welcome'));
    this.tweens.add({
      targets: this.boss,
      x: VIEW_WIDTH - 220,
      duration: 1600,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.busy = false;
        this.startBossActions(0.9);
        this.time.delayedCall(1500, () => words.destroy());
      },
    });
  }

  // A shout from the King (red, over the room)
  say(text) {
    return this.add.text(480, 200, text, { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ff5252', align: 'center' }).setStroke('#000000', 6).setOrigin(0.5).setScrollFactor(0).setDepth(10);
  }

  bossAction() {
    if (this.busy) return;
    const choices = this.phase === 1 ? ['cannons', 'zap', 'zap', 'fly'] : ['chomp', 'tail', 'stomp', 'zap'];
    const action = Phaser.Math.RND.pick(choices);
    this[`action_${action}`]();
  }

  // Phase 1: laser cannons on both sides of the throne, aimed at you
  action_cannons() {
    const target = this.nearestPlayer(this.boss.x);
    audio.play('laser');
    for (const side of [-1, 1]) {
      const x = this.boss.x + side * 100;
      const y = this.boss.y + 40;
      const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
      for (const spread of [-0.15, 0.15]) {
        const speed = this.settings.enemyShotSpeed * 1.1;
        this.enemyShoot(x, y, Math.cos(angle + spread) * speed, Math.sin(angle + spread) * speed);
      }
    }
  }

  action_fly() {
    this.busy = true;
    const target = this.nearestPlayer(this.boss.x);
    const x = Phaser.Math.Clamp(target.x + Phaser.Math.Between(-250, 250), 150, VIEW_WIDTH - 150);
    this.tweens.add({ targets: this.boss, x, y: Phaser.Math.Between(...FLY_Y), duration: 1100, ease: 'Sine.easeInOut', onComplete: () => (this.busy = false) });
  }

  // THE TROPHY ZAPPER: a warning line, then the beam. Get out of the way!
  action_zap() {
    this.busy = true;
    const target = this.nearestPlayer(this.boss.x);
    const to = { x: target.x, y: FLOOR };
    const zap = { to, startedAt: this.time.now };
    this.zap = zap;
    audio.play('alarm');
    this.time.delayedCall(ZAP_WARNING_MS, () => {
      if (this.zap !== zap) return;
      zap.firing = true;
      audio.play('laser');
      audio.play('freeze');
      this.time.delayedCall(ZAP_MS, () => {
        if (this.zap === zap) this.zap = null;
        this.zapGraphics.clear();
        this.busy = false;
      });
    });
  }

  zapperTip() {
    // The zapper is in his hand (left of the throne, or of him on foot)
    const left = this.boss.flipX ? 1 : -1;
    return this.phase === 1 ? { x: this.boss.x + left * 80, y: this.boss.y - 21 } : { x: this.boss.x + left * 60, y: this.boss.y - 5 };
  }

  updateZap() {
    const zap = this.zap;
    const g = this.zapGraphics.clear();
    if (!zap || !this.boss.active) return;
    const from = this.zapperTip();
    if (!zap.firing) {
      const blink = Math.floor((this.time.now - zap.startedAt) / 100) % 2 === 0;
      g.lineStyle(3, 0xffeb3b, blink ? 0.9 : 0.3).lineBetween(from.x, from.y, zap.to.x, zap.to.y);
      return;
    }
    g.lineStyle(ZAP_WIDTH, 0xffeb3b, 0.8).lineBetween(from.x, from.y, zap.to.x, zap.to.y);
    g.lineStyle(12, 0xffffff, 1).lineBetween(from.x, from.y, zap.to.x, zap.to.y);
    const line = new Phaser.Geom.Line(from.x, from.y, zap.to.x, zap.to.y);
    for (const player of this.players) {
      if (player.invisible || player.unhurtable || this.time.now < this.safeUntil) continue;
      const nearest = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(player.x, player.y));
      if (Phaser.Math.Distance.Between(player.x, player.y, nearest.x, nearest.y) < ZAP_WIDTH / 2 + 18) this.trophyHero(player);
    }
  }

  // ZAPPED: this hero becomes a gold trophy, and you go on with the next one
  trophyHero(player) {
    this.zap = null;
    this.zapGraphics.clear();
    const id = this.heroes[this.heroIndex];
    const statue = goldify(this.add.image(player.x, FLOOR - 44, `${heroKey(id, this.palette)}-idle`).setScale(1.5).setFlipX(player.sprite.flipX).setDepth(1.6));
    const base = this.add.rectangle(player.x, FLOOR - 8, 70, 16, 0xffa000).setDepth(1.5);
    this.trophies.push({ id, statue, base });
    this.heroes.splice(this.heroIndex, 1);
    this.cameras.main.flash(250, 255, 236, 130);
    audio.play('shatter');
    if (this.heroes.length === 0) return this.allTrophies();
    this.heroIndex %= this.heroes.length;
    const next = this.heroes[this.heroIndex];
    this.character = getCharacter(next);
    player.setCharacter(this.character, heroKey(next, this.palette), this.save.wearing?.[next] ?? null);
    player.respawnAt({ x: Phaser.Math.Clamp(player.x + (player.x < 480 ? 120 : -120), 60, VIEW_WIDTH - 60), y: FLOOR - 60 });
    this.safeUntil = this.time.now + 1800;
    this.showSwitchText();
    if (this.heroes.length === 1) this.switchText?.setText('');
    this.kingWords?.destroy();
    const words = this.say(t('story.king.gotOne', { name: t(`name.${id}`) }));
    this.kingWords = words;
    this.time.delayedCall(1600, () => words.destroy());
  }

  // Everyone is a trophy: start the fight over
  allTrophies() {
    this.won = true;
    this.kingWords?.destroy();
    this.bossTimer?.remove();
    for (const player of this.players) player.sprite.setVisible(false).body.enable = false;
    this.player.hatSprite?.setVisible(false);
    audio.stopMusic();
    this.bigMessage(t('story.allTrophies'), '#ff5252').setScale(0.7);
    this.time.delayedCall(3000, () => this.scene.restart(this.startData));
  }

  // ---------- Phase 2: on foot ----------

  hitBoss(amount) {
    super.hitBoss(amount);
    if (this.phase === 1 && this.boss.getData('hp') > 0 && this.boss.getData('hp') <= this.settings.bossHp / 2) this.breakThrone();
  }

  breakThrone() {
    this.phase = 2;
    this.busy = true;
    this.zap = null;
    this.zapGraphics.clear();
    this.tweens.killTweensOf(this.boss);
    audio.play('explosion');
    this.cameras.main.shake(700, 0.02);
    for (let i = 0; i < 14; i++) {
      const piece = this.add.rectangle(this.boss.x + Phaser.Math.Between(-80, 80), this.boss.y + Phaser.Math.Between(-40, 60), 14, 14, i % 2 ? 0xffc107 : 0xc62828).setDepth(4);
      this.tweens.add({ targets: piece, x: piece.x + Phaser.Math.Between(-200, 200), y: FLOOR, angle: 540, alpha: 0, duration: 1100, ease: 'Quad.easeIn', onComplete: () => piece.destroy() });
    }
    this.boss.setTexture('croc-king-walk');
    this.boss.body.setSize(110, 140).setOffset(30, 26);
    this.boss.body.setAllowGravity(true);
    this.boss.setVelocity(0, -200);
    const words = this.say(t('story.king.angry'));
    this.time.delayedCall(2200, () => {
      words.destroy();
      this.busy = false;
    });
  }

  bossLanded() {
    if (this.stompingDown && this.boss.body.velocity.y >= 0 && this.time.now > this.stompedAt + 250) {
      this.stompingDown = false;
      audio.play('pound');
      this.cameras.main.shake(300, 0.015);
      for (const dir of [-1, 1]) this.enemyShoot(this.boss.x + dir * 60, FLOOR - 16, dir * this.settings.enemyShotSpeed * 1.1, 0, 'fireball').setScale(0.8);
    }
  }

  action_chomp() {
    const dir = this.nearestPlayer(this.boss.x).x < this.boss.x ? -1 : 1;
    this.boss.setVelocityX(dir * 440);
    audio.play('scratch');
  }

  action_tail() {
    this.busy = true;
    this.tailUntil = this.time.now + 600;
    audio.play('fly');
    this.tweens.add({ targets: this.boss, angle: 360, duration: 600, onComplete: () => this.boss.setAngle(0) });
    this.time.delayedCall(700, () => (this.busy = false));
  }

  action_stomp() {
    if (!this.boss.body.blocked.down) return;
    const target = this.nearestPlayer(this.boss.x);
    this.boss.setVelocity(Phaser.Math.Clamp(target.x - this.boss.x, -340, 340), -760);
    this.stompingDown = true;
    this.stompedAt = this.time.now;
  }

  updateBoss() {
    const boss = this.boss;
    const target = this.nearestPlayer(boss.x);
    boss.setFlipX(target.x > boss.x); // drawn facing left
    if (this.phase === 2 && boss.body.blocked.down) boss.setVelocityX(boss.body.velocity.x * 0.95);
    if (this.time.now < (this.tailUntil ?? 0)) {
      for (const player of this.players) if (Phaser.Math.Distance.Between(player.x, player.y, boss.x, boss.y) < 150) this.hurt(boss.x, player);
    }
    this.updateZap();
  }

  pushBoss(dir) {
    if (this.phase === 2) this.boss.setVelocityX(dir * 250);
  }

  // ---------- The end: his own zapper backfires ----------

  defeatBoss() {
    this.won = true;
    this.bossTimer?.remove();
    this.zap = null;
    this.zapGraphics.clear();
    this.enemyShots.clear(true, true);
    this.tweens.killTweensOf(this.boss);
    this.boss.body.setVelocity(0, 0).setAllowGravity(false);
    this.boss.setAngle(0);
    audio.stopMusic();
    this.addBolts(BOSS_REWARD * 5);
    for (const player of this.players) player.sprite.setVelocity(0, 0);
    const words = this.say(t('story.king.noo'));
    // The zapper sparks, then ZAP: the beam bounces back at him
    this.time.delayedCall(1200, () => {
      words.destroy();
      const from = this.zapperTip();
      const g = this.zapGraphics;
      g.lineStyle(ZAP_WIDTH, 0xffeb3b, 0.8).strokeCircle(from.x, from.y, 30);
      audio.play('freeze');
      this.cameras.main.flash(400, 255, 236, 130);
      goldify(this.boss);
      this.boss.y = Math.min(this.boss.y, FLOOR - 90);
      this.add.rectangle(this.boss.x, this.boss.y + 80, 160, 20, 0xffa000).setDepth(1);
      this.time.delayedCall(400, () => g.clear());
      this.bigMessage(t('story.kingTrophy'), '#ffd23f').setScale(0.7);
      // Every trophy hero breaks free
      for (const trophy of this.trophies) {
        audio.play('shatter');
        ungoldify(trophy.statue);
        trophy.base.destroy();
        this.tweens.add({ targets: trophy.statue, y: trophy.statue.y - 40, duration: 300, yoyo: true, repeat: 2 });
      }
      this.time.delayedCall(800, () => audio.play('win'));
      this.time.delayedCall(4000, () => this.finish());
    });
  }

  finish() {
    if (this.rush) {
      const message = this.bigMessage(t('story.kingRushDone'), '#b9f6ca').setScale(0.7);
      this.time.delayedCall(3000, () => {
        message.destroy();
        this.scene.start('Title');
      });
      return;
    }
    const story = storyProgress(this.save);
    story.kingBeaten = true;
    story.freed = [...new Set([...story.freed, 'castle'])];
    this.save.hats ??= [];
    if (!this.save.hats.includes('champion')) this.save.hats.push('champion');
    writeSave(this.save);
    this.scene.start('StoryEnding');
  }

  // (There's no trophy or key here: the King's defeat is handled above.)
  dropKey() {}
}
