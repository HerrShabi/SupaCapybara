import Phaser from 'phaser';
import { CHARACTERS, KEYS, POWER_UPS } from '../characters.js';
import { t, setLanguage, getLanguage, LANGUAGES } from '../i18n.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../difficulty.js';
import { audio } from '../audio.js';
import { loadSave, writeSave } from '../save.js';
import { createHeroTextures, heroKey, PALETTES } from '../art/heroes.js';
import { HATS, createHatTextures, hatAnchor } from '../art/hats.js';
import { createEffectTextures } from '../art/effects.js';
import { createBoltTexture } from '../art/bolt.js';
import { createItemTextures } from '../art/items.js';

// Character select. The shop is at the bottom right, with the boss keys right under it.

const FONT = 'Arial Black, Arial';
const CARD_HEIGHT = 200;
const CARD_GAP = 12;
const CARDS_WIDTH = 904; // all the cards together
const CARDS_TOP = 92;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const savedForColors = loadSave();
    this.secretsUnlocked = savedForColors.keys.includes('world3'); // beating the Lava Dragon unlocks the secrets
    this.palette = this.secretsUnlocked ? savedForColors.palette ?? 0 : 0;
    createHeroTextures(this);
    createHeroTextures(this, this.palette);
    createEffectTextures(this);
    createBoltTexture(this);
    createItemTextures(this);
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    audio.playMusic('menu');
    // Secret heroes only show up once they're unlocked (and then they're yours)
    this.characters = CHARACTERS.filter((c) => !c.secret || this.save.keys.includes(c.unlockKey));
    for (const c of this.characters) if (c.secret && !this.save.owned.includes(c.id)) this.save.owned.push(c.id);
    this.cardWidth = Math.min(164, (CARDS_WIDTH - (this.characters.length - 1) * CARD_GAP) / this.characters.length);
    this.selectedIndex = Math.max(0, this.characters.findIndex((c) => c.id === this.save.selected));

    this.add.rectangle(0, 0, 960, 540, 0x1b1b2f).setOrigin(0, 0);
    this.add
      .text(480, 44, 'SUPERCAPYBARA', { fontFamily: FONT, fontSize: '44px', color: '#ffd23f' })
      .setStroke('#000000', 8)
      .setOrigin(0.5);

    this.add.image(838, 44, 'bolt').setScale(1.3);
    this.add
      .text(860, 44, String(this.save.bolts), { fontFamily: FONT, fontSize: '26px', color: '#ffd23f' })
      .setStroke('#000000', 6)
      .setOrigin(0, 0.5);

    this.createLanguageButtons();
    this.createSoundButton();
    this.cards = this.characters.map((character, i) => this.createCard(character, i));
    this.createDifficultyButtons();
    this.createWorldButtons();
    this.createPlayButton();
    this.createTouchButton();
    this.createColorsButton();
    this.createWardrobeButton();
    const back = this.add
      .text(500, 506, t('menu.back'), { fontFamily: 'Arial', fontSize: '13px', color: '#cccccc' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Title'));
    back.setScale(Math.min(1, 76 / back.width));
    this.createShop();
    this.createKeys();

    this.message = this.add
      .text(480, 304, '', { fontFamily: FONT, fontSize: '16px', color: '#ff8a80' })
      .setStroke('#000000', 4)
      .setOrigin(0.5);

    this.input.keyboard.on('keydown-LEFT', () => this.select(this.selectedIndex - 1));
    this.input.keyboard.on('keydown-RIGHT', () => this.select(this.selectedIndex + 1));
    this.input.keyboard.on('keydown-ENTER', () => this.play());
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
    this.input.keyboard.on('keydown-M', () => this.toggleSound());
    this.input.keyboard.on('keydown-SPACE', () => this.play());

    this.select(this.selectedIndex);
  }

  owns(character) {
    return this.save.owned.includes(character.id);
  }

  // ---------- Hero cards ----------

  createCard(character, i) {
    const x = 28 + i * (this.cardWidth + CARD_GAP);
    const centerX = x + this.cardWidth / 2;
    const owned = this.owns(character);
    const canBuy = !owned && character.price && this.save.keys.includes(character.unlockKey);

    const border = this.add
      .rectangle(x, CARDS_TOP, this.cardWidth, CARD_HEIGHT, 0x2c2c54)
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.select(i));

    this.add
      .text(centerX, CARDS_TOP + 18, t(`name.${character.id}`), { fontFamily: FONT, fontSize: '15px', color: '#ffffff' })
      .setOrigin(0.5);

    if (character.fireAura) {
      this.add.image(centerX, CARDS_TOP + 82, character.auraTexture ?? 'aura').setScale(0.9).setAlpha(owned ? 1 : 0.3);
    }
    const look = heroKey(character.id, this.palette);
    const hero = this.add.sprite(centerX, CARDS_TOP + 80, `${look}-idle`).setScale(Math.min(2, this.cardWidth / 70));

    const hat = this.save.wearing?.[character.id];
    if (hat && owned) {
      createHatTextures(this);
      const scale = hero.scaleX;
      const anchor = hatAnchor(character.id, hat, scale);
      this.add.image(centerX + anchor.x, CARDS_TOP + 80 + anchor.y, `hat-${hat}`).setScale(scale).setOrigin(0.5, hat === 'shades' ? 0.5 : 1);
    }

    if (owned) {
      hero.play(`${look}-run`);
    } else {
      hero.setAlpha(0.3);
      this.add.image(centerX, CARDS_TOP + 80, 'lock');
    }

    this.add
      .text(centerX, CARDS_TOP + 140, t(`power.${character.id}`), {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: this.cardWidth - 16 },
      })
      .setOrigin(0.5);

    if (canBuy) {
      this.createBuyButton(character, centerX, CARDS_TOP + 176);
    } else if (!owned && this.save.keys.includes(character.unlockKey)) {
      this.add.text(centerX, CARDS_TOP + 176, t('menu.soon'), { fontFamily: FONT, fontSize: '13px', color: '#aaaaaa' }).setOrigin(0.5);
    } else if (!owned) {
      const unlockHint = this.add
        .text(centerX, CARDS_TOP + 176, t('menu.beat', { boss: t(`boss.${character.unlockKey}`) }), { fontFamily: FONT, fontSize: '13px', color: '#ff8a80' })
        .setOrigin(0.5);
      unlockHint.setScale(Math.min(1, (this.cardWidth - 12) / unlockHint.width));
    }

    return border;
  }

  createBuyButton(character, x, y) {
    const button = this.add
      .rectangle(x, y, 150, 30, 0x2e7d32)
      .setStrokeStyle(3, 0xb9f6ca)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.buy(character));
    const label = this.add.text(x - 10, y, t('menu.buy', { price: character.price }), { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    label.setScale(Math.min(1, 100 / label.width));
    this.add.image(x + 52, y, 'bolt').setScale(0.75);
    return button;
  }

  select(index) {
    if (this.cards && index !== this.selectedIndex) audio.play('click');
    this.selectedIndex = Phaser.Math.Wrap(index, 0, this.characters.length);
    this.cards.forEach((card, i) => {
      const selected = i === this.selectedIndex;
      card.setStrokeStyle(selected ? 6 : 4, selected ? 0xffd23f : 0x555588);
    });
    const character = this.characters[this.selectedIndex];
    this.playLabel.setText(this.owns(character) ? t('menu.play', { name: t(`name.${character.id}`).toUpperCase() }) : t('menu.locked'));
    this.playLabel.setScale(Math.min(1, 296 / this.playLabel.width));
    this.message?.setText('');
  }

  buy(character) {
    if (this.save.bolts < character.price) {
      this.message.setText(t('menu.needBolts', { count: character.price - this.save.bolts }));
      audio.play('error');
      this.cameras.main.shake(150, 0.005);
      return;
    }
    audio.play('buy');
    this.save.bolts -= character.price;
    this.save.owned.push(character.id);
    this.save.selected = character.id;
    writeSave(this.save);
    this.scene.restart();
  }

  // ---------- Play ----------

  createPlayButton() {
    this.add
      .rectangle(332, 400, 316, 70, 0x2e7d32)
      .setStrokeStyle(5, 0xb9f6ca)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.play());
    this.playLabel = this.add
      .text(332, 400, '', { fontFamily: FONT, fontSize: '26px', color: '#ffffff' })
      .setStroke('#000000', 5)
      .setOrigin(0.5);
    const help = this.add
      .text(270, 462, `${t('menu.choose')}\n${t('menu.controls')}`, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5);
    help.setScale(Math.min(1, 480 / help.width));
  }

  play() {
    const character = this.characters[this.selectedIndex];
    if (!this.owns(character)) {
      this.message.setText(t('menu.isLocked', { name: t(`name.${character.id}`) }));
      audio.play('error');
      this.cameras.main.shake(150, 0.005);
      return;
    }
    this.save.selected = character.id;
    writeSave(this.save);
    audio.play('click');
    if (this.save.world === 'rush' && this.secretsUnlocked) {
      this.scene.start('World1', { bossRush: true });
    } else {
      // Pass {} so the level forgets old Boss Rush or team data (Phaser keeps the last data otherwise)
      this.scene.start(this.worldUnlocked(this.save.world) ? `World${this.save.world}` : 'World1', {});
    }
  }

  // ---------- Level picker (left of PLAY) and touch buttons on/off (bottom left) ----------

  // Each world opens with the key from the boss of the world before it.
  // number is 1, 2, 3 or 'rush' (Boss Rush, a secret).
  worldUnlocked(number) {
    if (number === 'rush') return this.secretsUnlocked;
    return number === 1 || this.save.keys.includes(`world${number - 1}`);
  }

  createWorldButtons() {
    const worlds = this.secretsUnlocked ? [1, 2, 3, 'rush'] : [1, 2, 3];
    const spacing = worlds.length > 3 ? 26 : 30;
    worlds.forEach((number, i) => {
      const y = (worlds.length > 3 ? 361 : 370) + i * spacing;
      const unlocked = this.worldUnlocked(number);
      const selected = number === this.save.world && unlocked;
      this.add
        .rectangle(86, y, 140, spacing - 4, selected ? (number === 'rush' ? 0xc62828 : 0x1565c0) : 0x2c2c54)
        .setStrokeStyle(3, selected ? 0xffd23f : 0x555588)
        .setAlpha(unlocked ? 1 : 0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.chooseWorld(number));
      this.add
        .text(unlocked ? 86 : 78, y, number === 'rush' ? `🥊 ${t('menu.bossRush')}` : t('menu.world', { number }), { fontFamily: FONT, fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5)
        .setAlpha(unlocked ? 1 : 0.5);
      if (!unlocked) this.add.image(140, y, 'lock').setScale(0.6);
    });
  }

  chooseWorld(number) {
    if (!this.worldUnlocked(number)) {
      this.message.setText(t('menu.worldLocked', { boss: t(`boss.world${number - 1}`) }));
      audio.play('error');
      this.cameras.main.shake(150, 0.005);
      return;
    }
    this.save.world = number;
    writeSave(this.save);
    audio.play('click');
    this.scene.restart();
  }

  // Secret colors (after beating the Lava Dragon): cycles every hero's suit and cape colors.
  createColorsButton() {
    if (!this.secretsUnlocked) return;
    this.add
      .rectangle(236, 506, 140, 28, this.palette ? 0x6a1b9a : 0x2c2c54)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.save.palette = ((this.save.palette ?? 0) + 1) % PALETTES.length;
        writeSave(this.save);
        audio.play('click');
        this.scene.restart();
      });
    this.add
      .text(236, 506, `🎨 ${t('menu.colors')} ${this.palette || ''}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);
  }

  // ---------- Wardrobe: pick the hat for the selected hero (hats come from ADVENTURE chests) ----------

  createWardrobeButton() {
    const x = this.secretsUnlocked ? 386 : 236;
    this.add
      .rectangle(x, 506, 140, 28, 0x00695c)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.openWardrobe());
    const label = this.add.text(x, 506, `🎩 ${t('menu.wardrobe')}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    label.setScale(Math.min(1, 130 / label.width));
  }

  openWardrobe() {
    createHatTextures(this);
    audio.play('click');
    const character = this.characters[this.selectedIndex];
    const hats = HATS.filter((hat) => this.save.hats?.includes(hat));
    const wearing = this.save.wearing?.[character.id] ?? null;
    const panel = this.add.container(0, 0).setDepth(20);
    const add = (object) => panel.add(object) && object;

    add(this.add.rectangle(0, 0, 960, 540, 0x000000, 0.6).setOrigin(0, 0).setInteractive()); // blocks clicks behind
    add(this.add.rectangle(480, 290, 700, 330, 0x2c2c54).setStrokeStyle(4, 0xffd23f));
    add(this.add.text(480, 150, `🎩 ${t('menu.wardrobe')}: ${t(`name.${character.id}`)}`, { fontFamily: FONT, fontSize: '24px', color: '#ffd23f' }).setOrigin(0.5));
    add(this.add.text(820, 150, '✕', { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5))
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => panel.destroy());

    if (hats.length === 0) {
      add(this.add.text(480, 290, t('menu.findHats'), { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0.5));
      return;
    }

    const choices = [null, ...hats];
    choices.forEach((hat, i) => {
      const x = 480 + (i - (choices.length - 1) / 2) * 110;
      const selected = hat === wearing;
      add(this.add.rectangle(x, 280, 96, 110, selected ? 0x1565c0 : 0x1b1b2f).setStrokeStyle(3, selected ? 0xffd23f : 0x555588))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.save.wearing ??= {};
          if (hat) this.save.wearing[character.id] = hat;
          else delete this.save.wearing[character.id];
          writeSave(this.save);
          audio.play('buy');
          this.scene.restart();
        });
      if (hat) add(this.add.image(x, 270, `hat-${hat}`).setScale(2.5));
      else add(this.add.text(x, 270, '🚫', { fontSize: '36px' }).setOrigin(0.5));
      const name = add(this.add.text(x, 320, hat ? t(`hat.${hat}`) : t('menu.noHat'), { fontFamily: 'Arial', fontSize: '13px', color: '#ffffff', align: 'center', wordWrap: { width: 90 } }).setOrigin(0.5));
      name.setScale(Math.min(1, 90 / name.width));
    });
  }

  createTouchButton() {
    this.add
      .rectangle(86, 506, 140, 28, this.save.touch ? 0x2e7d32 : 0x2c2c54)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.save.touch = !this.save.touch;
        writeSave(this.save);
        this.scene.restart();
      });
    this.add
      .text(86, 506, `📱 ${t(this.save.touch ? 'menu.touchOn' : 'menu.touchOff')}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);
  }

  // ---------- Difficulty (above the PLAY button) ----------

  createDifficultyButtons() {
    DIFFICULTY_ORDER.forEach((id, i) => {
      const x = 102 + i * 112;
      const selected = id === this.save.difficulty;
      this.add
        .rectangle(x, 327, 104, 34, selected ? DIFFICULTIES[id].color : 0x2c2c54)
        .setStrokeStyle(3, selected ? 0xffffff : DIFFICULTIES[id].color)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setDifficulty(id));
      const label = this.add
        .text(x, 327, t(`difficulty.${id}`), { fontFamily: FONT, fontSize: '15px', color: '#ffffff' })
        .setStroke('#000000', 4)
        .setOrigin(0.5);
      label.setScale(Math.min(1, 94 / label.width));
    });
  }

  setDifficulty(id) {
    this.save.difficulty = id;
    writeSave(this.save);
    this.scene.restart();
  }

  // ---------- Sound on/off (top right) ----------

  createSoundButton() {
    this.add
      .rectangle(762, 44, 84, 34, this.save.muted ? 0x2c2c54 : 0x2e7d32)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSound());
    this.add
      .text(762, 44, t(this.save.muted ? 'menu.soundOff' : 'menu.soundOn'), { fontFamily: FONT, fontSize: '15px', color: '#ffffff' })
      .setOrigin(0.5);
  }

  toggleSound() {
    this.save.muted = !this.save.muted;
    writeSave(this.save);
    audio.setMuted(this.save.muted);
    this.scene.restart();
  }

  // ---------- Language (top left) ----------

  createLanguageButtons() {
    LANGUAGES.forEach((language, i) => {
      const x = 76 + i * 122;
      const selected = language.id === getLanguage();
      this.add
        .rectangle(x, 44, 112, 34, selected ? 0x2e7d32 : 0x2c2c54)
        .setStrokeStyle(3, selected ? 0xffd23f : 0x555588)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLanguage(language.id));
      this.add.text(x, 44, language.name, { fontFamily: FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    });
  }

  setLanguage(id) {
    this.save.language = id;
    writeSave(this.save);
    this.scene.restart();
  }

  // ---------- Shop (bottom right) and keys (under it) ----------

  createShop() {
    const left = 540;
    const top = 312;
    this.add.rectangle(left, top, 392, 150, 0x2c2c54).setOrigin(0, 0).setStrokeStyle(3, 0xffd23f);
    this.add.text(left + 14, top + 8, t('menu.shop'), { fontFamily: FONT, fontSize: '20px', color: '#ffd23f' });
    this.add.text(left + 378, top + 13, t('menu.clickToBuy'), { fontFamily: 'Arial', fontSize: '13px', color: '#aaaaaa' }).setOrigin(1, 0);

    POWER_UPS.forEach((powerUp, i) => {
      const column = i < 3 ? 0 : 1;
      const row = i < 3 ? i : i - 3;
      const x = left + 14 + column * 192;
      const y = top + 50 + row * 32;
      const owned = this.save.powerUps.includes(powerUp.id);

      const parts = [this.add.text(x, y, t(`powerUp.${powerUp.id}`), { fontFamily: 'Arial', fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5)];
      if (owned) {
        parts.push(this.add.text(x + 178, y, t('menu.owned'), { fontFamily: FONT, fontSize: '13px', color: '#b9f6ca' }).setOrigin(1, 0.5));
      } else {
        parts.push(this.add.text(x + 160, y, String(powerUp.price), { fontFamily: FONT, fontSize: '14px', color: '#ffd23f' }).setOrigin(1, 0.5));
        parts.push(this.add.image(x + 172, y, 'bolt').setScale(0.6));
      }

      if (!powerUp.ready) {
        parts.forEach((part) => part.setAlpha(0.4));
        this.add.text(x + 60, y + 11, t('menu.soon'), { fontFamily: 'Arial', fontSize: '10px', color: '#aaaaaa' }).setOrigin(0, 0.5);
      } else if (!owned) {
        this.add
          .rectangle(x - 6, y, 190, 28, 0xffffff, 0.08)
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.buyPowerUp(powerUp));
      }
    });
  }

  buyPowerUp(powerUp) {
    if (powerUp.needs && !this.save.powerUps.includes(powerUp.needs)) {
      this.message.setText(t('menu.buyFirst', { name: t(`powerUp.${powerUp.needs}`) }));
      audio.play('error');
      this.cameras.main.shake(150, 0.005);
      return;
    }
    if (this.save.bolts < powerUp.price) {
      this.message.setText(t('menu.needBolts', { count: powerUp.price - this.save.bolts }));
      audio.play('error');
      this.cameras.main.shake(150, 0.005);
      return;
    }
    audio.play('buy');
    this.save.bolts -= powerUp.price;
    this.save.powerUps.push(powerUp.id);
    writeSave(this.save);
    this.scene.restart();
  }

  createKeys() {
    const left = 540;
    const top = 470;
    this.add.rectangle(left, top, 392, 56, 0x2c2c54).setOrigin(0, 0).setStrokeStyle(3, 0x9aa0aa);
    this.add.text(left + 14, top + 28, t('menu.keys'), { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0, 0.5);

    KEYS.forEach((key, i) => {
      const x = left + 180 + i * 80;
      const icon = this.add.image(x, top + 28, 'key');
      if (!this.save.keys.includes(key.id)) icon.setAlpha(0.2);
    });
  }
}
