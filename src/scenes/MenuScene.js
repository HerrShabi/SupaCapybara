import Phaser from 'phaser';
import { CHARACTERS, KEYS, POWER_UPS, DANCES } from '../characters.js';
import { t, setLanguage, getLanguage, LANGUAGES } from '../i18n.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../difficulty.js';
import { audio } from '../audio.js';
import { loadSave, writeSave } from '../save.js';
import { createHeroTextures, heroKey, PALETTES } from '../art/heroes.js';
import { HATS, createHatTextures, hatAnchor } from '../art/hats.js';
import { createEffectTextures } from '../art/effects.js';
import { createBoltTexture } from '../art/bolt.js';
import { createItemTextures } from '../art/items.js';
import { addBackButton } from '../backButton.js';
import { WORLD_COUNT, startWorld } from '../trips/worlds.js';

// STORY's menu (also called character select):
// - top bar: languages, logo, sound, bolts
// - 🦸 HEROES: a row of hero cards (pick with ◀ ▶, buy locked heroes)
// - 🗺️ WORLDS: a card for each world with its picture and name (pick with ▲ ▼), plus 🥊 BOSS RUSH once unlocked
// - difficulty and one wide PLAY button ("PLAY <hero>" and the world)
// - right side: the shop, and the boss keys under it
// - bottom: touch buttons, secret colors, wardrobe, back

// Each world card's picture and color
const WORLD_LOOKS = {
  1: { icon: '🏙️', color: 0x1565c0 },
  2: { icon: '🚀', color: 0x4527a0 },
  3: { icon: '🌋', color: 0xbf360c },
  4: { icon: '☁️', color: 0x0288d1 },
  5: { icon: '🌊', color: 0x01579b },
  6: { icon: '🌴', color: 0x2e7d32 },
  7: { icon: '🏰', color: 0x455a64 },
  8: { icon: '👑', color: 0x6a1b9a },
};

const FONT = 'Arial Black, Arial';
const CARD_HEIGHT = 124;
const CARD_GAP = 10;
const CARDS_WIDTH = 904; // all the hero cards together, at most
const CARDS_TOP = 58;
const LEFT = 28; // the left part (worlds, difficulty, PLAY) goes from here...
const LEFT_WIDTH = 604; // ...this wide
const RIGHT = 648; // the shop and keys
const RIGHT_WIDTH = 284;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.wardrobe = null;
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
    this.cardWidth = Math.min(150, (CARDS_WIDTH - (this.characters.length - 1) * CARD_GAP) / this.characters.length);
    this.cardsLeft = 480 - (this.characters.length * (this.cardWidth + CARD_GAP) - CARD_GAP) / 2;
    this.selectedIndex = Math.max(0, this.characters.findIndex((c) => c.id === this.save.selected));

    this.add.rectangle(0, 0, 960, 540, 0x1b1b2f).setOrigin(0, 0);
    this.add
      .text(480, 28, 'SUPERCAPYBARA', { fontFamily: FONT, fontSize: '32px', color: '#ffd23f' })
      .setStroke('#000000', 7)
      .setOrigin(0.5);

    this.add.image(846, 28, 'bolt').setScale(1.1);
    this.boltText = this.add
      .text(866, 28, String(this.save.bolts), { fontFamily: FONT, fontSize: '22px', color: '#ffd23f' })
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
    this.createDrawingModeButton();
    addBackButton(this, RIGHT + RIGHT_WIDTH - 60, 506, () => this.scene.start('Title'));
    this.createShop();
    this.createKeys();

    this.message = this.add
      .text(LEFT + LEFT_WIDTH / 2, 474, '', { fontFamily: FONT, fontSize: '15px', color: '#ff8a80' })
      .setStroke('#000000', 4)
      .setOrigin(0.5);

    this.input.keyboard.on('keydown-LEFT', () => this.select(this.selectedIndex - 1));
    this.input.keyboard.on('keydown-RIGHT', () => this.select(this.selectedIndex + 1));
    this.input.keyboard.on('keydown-UP', () => this.stepWorld(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.stepWorld(1));
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
    const x = this.cardsLeft + i * (this.cardWidth + CARD_GAP);
    const centerX = x + this.cardWidth / 2;
    const owned = this.owns(character);
    const canBuy = !owned && character.price && this.save.keys.includes(character.unlockKey);

    const border = this.add
      .rectangle(x, CARDS_TOP, this.cardWidth, CARD_HEIGHT, 0x2c2c54)
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.select(i));

    const name = this.add.text(centerX, CARDS_TOP + 13, t(`name.${character.id}`), { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    name.setScale(Math.min(1, (this.cardWidth - 10) / name.width));

    const heroY = CARDS_TOP + 54;
    if (character.fireAura) {
      this.add.image(centerX, heroY + 2, character.auraTexture ?? 'aura').setScale(0.65).setAlpha(owned ? 1 : 0.3);
    }
    const look = heroKey(character.id, this.palette);
    const hero = this.add.sprite(centerX, heroY, `${look}-idle`).setScale(1.35);

    const hat = this.save.wearing?.[character.id];
    if (hat && owned) {
      createHatTextures(this);
      const anchor = hatAnchor(character.id, hat, 1.35);
      this.add.image(centerX + anchor.x, heroY + anchor.y, `hat-${hat}`).setScale(1.35).setOrigin(0.5, hat === 'shades' ? 0.5 : 1);
    }

    if (owned) {
      hero.play(`${look}-run`);
    } else {
      hero.setAlpha(0.3);
      this.add.image(centerX, heroY, 'lock').setScale(0.8);
    }

    const power = this.add
      .text(centerX, CARDS_TOP + 92, t(`power.${character.id}`), { fontFamily: 'Arial', fontSize: '11px', color: '#cccccc', align: 'center', wordWrap: { width: this.cardWidth - 12 } })
      .setOrigin(0.5);
    power.setScale(Math.min(1, 26 / power.height));

    const bottomY = CARDS_TOP + CARD_HEIGHT - 13;
    if (canBuy) {
      this.createBuyButton(character, centerX, bottomY);
    } else if (!owned && this.save.keys.includes(character.unlockKey)) {
      this.add.text(centerX, bottomY, t('menu.soon'), { fontFamily: FONT, fontSize: '11px', color: '#aaaaaa' }).setOrigin(0.5);
    } else if (!owned) {
      const unlockHint = this.add
        .text(centerX, bottomY, t('menu.beat', { boss: t(`boss.${character.unlockKey}`) }), { fontFamily: FONT, fontSize: '11px', color: '#ff8a80' })
        .setOrigin(0.5);
      unlockHint.setScale(Math.min(1, (this.cardWidth - 12) / unlockHint.width));
    }

    return border;
  }

  createBuyButton(character, x, y) {
    const button = this.add
      .rectangle(x, y, Math.min(120, this.cardWidth - 12), 20, 0x2e7d32)
      .setStrokeStyle(2, 0xb9f6ca)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.buy(character));
    const label = this.add.text(x - 8, y, t('menu.buy', { price: character.price }), { fontFamily: FONT, fontSize: '11px', color: '#ffffff' }).setOrigin(0.5);
    label.setScale(Math.min(1, 84 / label.width));
    this.add.image(x + 44, y, 'bolt').setScale(0.5);
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
    this.playLabel.setScale(Math.min(1, (LEFT_WIDTH - 40) / this.playLabel.width));
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
    const centerX = LEFT + LEFT_WIDTH / 2;
    this.add
      .rectangle(centerX, 400, LEFT_WIDTH, 58, 0x2e7d32)
      .setStrokeStyle(5, 0xb9f6ca)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.play());
    this.playLabel = this.add
      .text(centerX, 391, '', { fontFamily: FONT, fontSize: '24px', color: '#ffffff' })
      .setStroke('#000000', 5)
      .setOrigin(0.5);
    const where = this.add
      .text(centerX, 417, `▶ ${this.worldLabel()}`, { fontFamily: FONT, fontSize: '13px', color: '#b9f6ca' })
      .setStroke('#000000', 4)
      .setOrigin(0.5);
    where.setScale(Math.min(1, (LEFT_WIDTH - 40) / where.width));
    const help = this.add
      .text(centerX, 448, `${t('menu.choose')}\n${t('menu.controls')}`, { fontFamily: 'Arial', fontSize: '12px', color: '#aaaaaa', align: 'center' })
      .setOrigin(0.5);
    help.setScale(Math.min(1, LEFT_WIDTH / help.width));
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
      startWorld(this, this.worldUnlocked(this.save.world) ? this.save.world : 1, character.id);
    }
  }

  // ---------- Level picker (left of PLAY) and touch buttons on/off (bottom left) ----------

  // Each world opens with the key from the boss of the world before it.
  // number is 1 to 8, or 'rush' (Boss Rush, a secret).
  worldUnlocked(number) {
    if (number === 'rush') return this.secretsUnlocked;
    return number === 1 || this.save.keys.includes(`world${number - 1}`);
  }

  // A card for every world (4 across): its picture, "WORLD n" and its name. Locked worlds show a lock.
  // 🥊 BOSS RUSH is a small button next to the WORLDS title once it's unlocked.
  createWorldButtons() {
    this.add.text(LEFT, 200, `🗺️ ${t('menu.worlds')}`, { fontFamily: FONT, fontSize: '15px', color: '#ffd23f' }).setOrigin(0, 0.5);
    const width = (LEFT_WIDTH - 3 * 8) / 4;
    for (let number = 1; number <= WORLD_COUNT; number++) {
      const i = number - 1;
      const x = LEFT + (i % 4) * (width + 8);
      const y = 214 + Math.floor(i / 4) * 54;
      const unlocked = this.worldUnlocked(number);
      const selected = number === this.save.world && unlocked;
      const look = WORLD_LOOKS[number];
      this.add
        .rectangle(x, y, width, 48, unlocked ? look.color : 0x22223a)
        .setOrigin(0, 0)
        .setStrokeStyle(selected ? 5 : 2, selected ? 0xffd23f : unlocked ? 0xffffff : 0x444466)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.chooseWorld(number));
      this.add.text(x + 22, y + 24, look.icon, { fontSize: '24px' }).setOrigin(0.5).setAlpha(unlocked ? 1 : 0.35);
      this.add.text(x + 42, y + 14, t('menu.world', { number }), { fontFamily: FONT, fontSize: '11px', color: unlocked ? '#ffffff' : '#777799' }).setOrigin(0, 0.5);
      const name = this.add.text(x + 42, y + 32, t(`world.name${number}`), { fontFamily: FONT, fontSize: '12px', color: unlocked ? '#ffd23f' : '#777799' }).setOrigin(0, 0.5);
      name.setScale(Math.min(1, (width - 48) / name.width));
      if (!unlocked) this.add.image(x + width - 14, y + 14, 'lock').setScale(0.4);
    }
    if (this.secretsUnlocked) {
      const selected = this.save.world === 'rush';
      const x = LEFT + LEFT_WIDTH - 70;
      this.add
        .rectangle(x, 200, 140, 22, selected ? 0xc62828 : 0x2c2c54)
        .setStrokeStyle(selected ? 4 : 2, selected ? 0xffd23f : 0xc62828)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.chooseWorld('rush'));
      this.add.text(x, 200, `🥊 ${t('menu.bossRush')}`, { fontFamily: FONT, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    }
  }

  // ▲ ▼: the world before / after (only unlocked ones)
  stepWorld(delta) {
    const current = typeof this.save.world === 'number' ? this.save.world : 1;
    const next = current + delta;
    if (next < 1 || next > WORLD_COUNT || !this.worldUnlocked(next)) return;
    this.chooseWorld(next);
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

  // The PLAY button says which world, e.g. "WORLD 4: CLOUD KINGDOM"
  worldLabel() {
    const world = this.save.world;
    if (world === 'rush') return t('menu.bossRush');
    const number = this.worldUnlocked(world) && WORLD_LOOKS[world] ? world : 1;
    return `${WORLD_LOOKS[number].icon} ${t('menu.world', { number })}: ${t(`world.name${number}`)}`;
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

  // ---------- Wardrobe: pick the hat (hats come from ADVENTURE chests) and buy and pick the win dance ----------

  createWardrobeButton() {
    const x = this.secretsUnlocked ? 386 : 236;
    this.add
      .rectangle(x, 506, 140, 28, 0x00695c)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        audio.play('click');
        this.openWardrobe();
      });
    const label = this.add.text(x, 506, `🎩 ${t('menu.wardrobe')}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    label.setScale(Math.min(1, 130 / label.width));
  }

  // ✏️ DRAWING MODE: every world looks drawn in Ethan's notebook (see src/sketch.js)
  createDrawingModeButton() {
    const x = this.secretsUnlocked ? 536 : 386;
    const on = Boolean(this.save.drawingMode);
    this.add
      .rectangle(x, 506, 140, 28, on ? 0x1a237e : 0x2c2c54)
      .setStrokeStyle(3, on ? 0xffd23f : 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.save.drawingMode = !on;
        writeSave(this.save);
        audio.play('click');
        this.scene.restart();
      });
    const label = this.add.text(x, 506, `✏️ ${t(on ? 'menu.drawingOn' : 'menu.drawingOff')}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    label.setScale(Math.min(1, 130 / label.width));
  }

  openWardrobe(note = '') {
    createHatTextures(this);
    this.wardrobe?.destroy();
    const character = this.characters[this.selectedIndex];
    const hats = HATS.filter((hat) => this.save.hats?.includes(hat));
    const wearing = this.save.wearing?.[character.id] ?? null;
    const panel = this.add.container(0, 0).setDepth(20);
    this.wardrobe = panel;
    const add = (object) => panel.add(object) && object;
    const label = (x, y, text, size, color = '#ffffff', width = 90) => {
      const object = add(this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5));
      object.setScale(Math.min(1, width / object.width));
      return object;
    };
    const card = (x, y, width, height, selected, onPick) =>
      add(this.add.rectangle(x, y, width, height, selected ? 0x1565c0 : 0x1b1b2f).setStrokeStyle(3, selected ? 0xffd23f : 0x555588))
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', onPick);

    add(this.add.rectangle(0, 0, 960, 540, 0x000000, 0.6).setOrigin(0, 0).setInteractive()); // blocks clicks behind
    add(this.add.rectangle(480, 290, 720, 360, 0x2c2c54).setStrokeStyle(4, 0xffd23f));
    label(480, 136, `🎩 ${t('menu.wardrobe')}: ${t(`name.${character.id}`)}`, 24, '#ffd23f', 600);
    add(this.add.text(820, 136, '✕', { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5))
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        panel.destroy();
        this.wardrobe = null;
      });

    // Hats
    label(480, 172, t('menu.hats'), 16, '#b9f6ca', 300);
    if (hats.length === 0) {
      label(480, 226, t('menu.findHats'), 18, '#ffffff', 600);
    } else {
      const choices = [null, ...hats];
      choices.forEach((hat, i) => {
        const x = 480 + (i - (choices.length - 1) / 2) * 106;
        card(x, 228, 96, 86, hat === wearing, () => {
          this.save.wearing ??= {};
          if (hat) this.save.wearing[character.id] = hat;
          else delete this.save.wearing[character.id];
          writeSave(this.save);
          audio.play('buy');
          this.scene.restart();
        });
        if (hat) add(this.add.image(x, 228, `hat-${hat}`).setScale(2.2));
        else add(this.add.text(x, 220, '🚫', { fontSize: '30px' }).setOrigin(0.5));
        label(x, 258, hat ? t(`hat.${hat}`) : t('menu.noHat'), 12);
      });
    }

    // Win dances: buy one by clicking it, then click to pick it for this hero. 🎲 = a random one you own.
    label(480, 292, t('menu.dances'), 16, '#b9f6ca', 400);
    const owned = this.save.dances ?? [];
    const picked = this.save.dancing?.[character.id] ?? null;
    const choices = [null, ...DANCES];
    choices.forEach((dance, i) => {
      const x = 480 + (i - (choices.length - 1) / 2) * 132;
      const has = !dance || owned.includes(dance.id);
      card(x, 360, 120, 100, has && (dance?.id ?? null) === picked, () => this.pickDance(character, dance));
      add(this.add.text(x, 334, dance ? dance.icon : '🎲', { fontSize: '30px' }).setOrigin(0.5)).setAlpha(has ? 1 : 0.5);
      label(x, 370, dance ? t(`dance.${dance.id}`) : t('menu.randomDance'), 14, '#ffffff', 110);
      const status = !dance ? '' : has ? t('menu.owned') : t('menu.buy', { price: `${dance.price} ⚡` });
      if (status) label(x, 394, status, 12, has ? '#b9f6ca' : '#ffd23f', 110);
    });
    label(480, 440, note || t('menu.danceHint'), 14, note ? '#ff8a80' : '#cccccc', 680);
  }

  pickDance(character, dance) {
    const owned = (this.save.dances ??= []);
    this.save.dancing ??= {};
    if (dance && !owned.includes(dance.id)) {
      if (this.save.bolts < dance.price) {
        audio.play('error');
        this.openWardrobe(t('menu.needBolts', { count: dance.price - this.save.bolts }));
        return;
      }
      this.save.bolts -= dance.price;
      owned.push(dance.id);
      this.boltText.setText(String(this.save.bolts));
    }
    if (dance) this.save.dancing[character.id] = dance.id;
    else delete this.save.dancing[character.id];
    writeSave(this.save);
    audio.play(dance ? 'buy' : 'click');
    this.openWardrobe();
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
    const width = (LEFT_WIDTH - 3 * 8) / 4;
    DIFFICULTY_ORDER.forEach((id, i) => {
      const x = LEFT + width / 2 + i * (width + 8);
      const selected = id === this.save.difficulty;
      this.add
        .rectangle(x, 345, width, 28, selected ? DIFFICULTIES[id].color : 0x2c2c54)
        .setStrokeStyle(3, selected ? 0xffffff : DIFFICULTIES[id].color)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setDifficulty(id));
      const label = this.add
        .text(x, 345, t(`difficulty.${id}`), { fontFamily: FONT, fontSize: '14px', color: '#ffffff' })
        .setStroke('#000000', 4)
        .setOrigin(0.5);
      label.setScale(Math.min(1, (width - 10) / label.width));
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
      .rectangle(770, 28, 84, 30, this.save.muted ? 0x2c2c54 : 0x2e7d32)
      .setStrokeStyle(3, 0x555588)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSound());
    this.add
      .text(770, 28, t(this.save.muted ? 'menu.soundOff' : 'menu.soundOn'), { fontFamily: FONT, fontSize: '14px', color: '#ffffff' })
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
      const x = 76 + i * 112;
      const selected = language.id === getLanguage();
      this.add
        .rectangle(x, 28, 104, 30, selected ? 0x2e7d32 : 0x2c2c54)
        .setStrokeStyle(3, selected ? 0xffd23f : 0x555588)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLanguage(language.id));
      this.add.text(x, 28, language.name, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    });
  }

  setLanguage(id) {
    this.save.language = id;
    writeSave(this.save);
    this.scene.restart();
  }

  // ---------- Shop (bottom right) and keys (under it) ----------

  createShop() {
    const top = 192;
    this.add.rectangle(RIGHT, top, RIGHT_WIDTH, 210, 0x2c2c54).setOrigin(0, 0).setStrokeStyle(3, 0xffd23f);
    this.add.text(RIGHT + 12, top + 8, `🛒 ${t('menu.shop')}`, { fontFamily: FONT, fontSize: '17px', color: '#ffd23f' });
    const hint = this.add.text(RIGHT + RIGHT_WIDTH - 10, top + 12, t('menu.clickToBuy'), { fontFamily: 'Arial', fontSize: '11px', color: '#aaaaaa' }).setOrigin(1, 0);
    hint.setScale(Math.min(1, 140 / hint.width));

    POWER_UPS.forEach((powerUp, i) => {
      const x = RIGHT + 14;
      const y = top + 50 + i * 26;
      const owned = this.save.powerUps.includes(powerUp.id);
      const right = RIGHT + RIGHT_WIDTH - 14;

      const parts = [this.add.text(x, y, t(`powerUp.${powerUp.id}`), { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0, 0.5)];
      if (owned) {
        parts.push(this.add.text(right, y, t('menu.owned'), { fontFamily: FONT, fontSize: '12px', color: '#b9f6ca' }).setOrigin(1, 0.5));
      } else {
        parts.push(this.add.text(right - 18, y, String(powerUp.price), { fontFamily: FONT, fontSize: '13px', color: '#ffd23f' }).setOrigin(1, 0.5));
        parts.push(this.add.image(right - 6, y, 'bolt').setScale(0.55));
      }

      if (!powerUp.ready) {
        parts.forEach((part) => part.setAlpha(0.4));
      } else if (!owned) {
        this.add
          .rectangle(RIGHT + 6, y, RIGHT_WIDTH - 12, 24, 0xffffff, 0.08)
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
    const top = 410;
    this.add.rectangle(RIGHT, top, RIGHT_WIDTH, 60, 0x2c2c54).setOrigin(0, 0).setStrokeStyle(3, 0x9aa0aa);
    this.add.text(RIGHT + 12, top + 14, `🔑 ${t('menu.keys')}`, { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(0, 0.5);
    KEYS.forEach((key, i) => {
      const x = RIGHT + 24 + i * 34;
      const icon = this.add.image(x, top + 40, 'key').setScale(0.45).setAngle(-60);
      if (!this.save.keys.includes(key.id)) icon.setAlpha(0.2);
    });
  }
}
