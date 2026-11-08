import Phaser from 'phaser';
import { loadSave, loadAccounts, switchAccount, addAccount, changeAccount, deleteAccount, MAX_ACCOUNTS } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { CHARACTERS } from '../characters.js';

// WHO'S PLAYING? (Ethan's design, 2026-11-08): the first screen. Up to 4 players, each with a name and a hero
// picture and their own save (see the accounts in save.js). Tap a player (or ◀ ▶ and ENTER) to play.
// Under each card: ✏️ change the name, 🦸 change the picture, 🗑️ delete (the capybara is very sad about it,
// then it asks "are you SURE?"). The empty card makes a new player. The title screen's 👤 button comes back here.

const FONT = 'Arial Black, Arial';
const CARD_WIDTH = 200;
const CARD_Y = 260;
const NAME_LENGTH = 12;

export class AccountsScene extends Phaser.Scene {
  constructor() {
    super('Accounts');
  }

  create() {
    const save = loadSave();
    setLanguage(save.language);
    audio.setMuted(save.muted);
    audio.playMusic('menu');
    createHeroTextures(this, 0);
    this.accounts = loadAccounts();
    this.busy = false;

    this.cameras.main.setBackgroundColor(0x0d1b3e);
    const stars = this.add.graphics().fillStyle(0xffffff);
    for (let i = 0; i < 80; i++) stars.fillCircle((i * 137) % 960, (i * 89) % 540, i % 3 === 0 ? 2 : 1);
    this.add.text(480, 56, t('accounts.title'), { fontFamily: FONT, fontSize: '44px', color: '#ffd23f' }).setStroke('#b71c1c', 10).setOrigin(0.5);

    const slots = this.accounts.list.length < MAX_ACCOUNTS ? [...this.accounts.list, null] : this.accounts.list;
    this.cardX = (i) => 480 + (i - (slots.length - 1) / 2) * 240; // centered
    this.cards = slots.map((account, i) => (account ? this.createCard(account, i) : this.createNewCard(i)));
    this.selected = Math.max(0, this.accounts.list.findIndex((a) => a.id === this.accounts.current));
    this.select(this.selected);
    this.add.text(480, 515, t('accounts.help'), { fontFamily: 'Arial', fontSize: '15px', color: '#cccccc' }).setOrigin(0.5);

    this.input.keyboard.on('keydown-LEFT', () => !this.busy && this.select(this.selected - 1));
    this.input.keyboard.on('keydown-RIGHT', () => !this.busy && this.select(this.selected + 1));
    const pick = () => !this.busy && this.cards[this.selected].pick();
    this.input.keyboard.on('keydown-ENTER', pick);
    this.input.keyboard.on('keydown-SPACE', pick);
    this.events.once('shutdown', () => this.nameBox?.remove());
  }

  cardBox(i) {
    return this.add
      .rectangle(this.cardX(i), CARD_Y, CARD_WIDTH, 280, 0x1a237e)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => !this.busy && this.select(i))
      .on('pointerdown', () => !this.busy && this.cards[i].pick());
  }

  createCard(account, i) {
    const x = this.cardX(i);
    const box = this.cardBox(i);
    const hero = this.add.image(x, CARD_Y - 40, `${heroKey(account.hero, 0)}-idle`).setScale(2.6);
    this.tweens.add({ targets: hero, y: hero.y - 8, duration: 600 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const name = this.add.text(x, CARD_Y + 80, account.name, { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setStroke('#000000', 6).setOrigin(0.5);
    name.setScale(Math.min(1, (CARD_WIDTH - 20) / name.width));
    if (account.id === this.accounts.current) this.add.text(x, CARD_Y - 120, `⭐ ${t('accounts.lastPlayed')}`, { fontFamily: FONT, fontSize: '12px', color: '#ffd23f' }).setOrigin(0.5);

    // ✏️ name, 🦸 picture, 🗑️ delete (not the last player)
    const tools = [
      ['✏️', () => this.askName(account.name, (text) => (changeAccount(account.id, { name: text }), this.scene.restart()))],
      ['🦸', () => this.nextPicture(account)],
    ];
    if (this.accounts.list.length > 1) tools.push(['🗑️', () => this.askDelete(account, hero, x)]);
    tools.forEach(([icon, action], k) => {
      const bx = x + (k - (tools.length - 1) / 2) * 60;
      this.add
        .rectangle(bx, CARD_Y + 175, 50, 40, 0x37474f)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.busy) return;
          audio.play('click');
          action();
        });
      this.add.text(bx, CARD_Y + 175, icon, { fontSize: '22px' }).setOrigin(0.5);
    });

    return {
      box,
      pick: () => {
        audio.play('click');
        switchAccount(account.id);
        this.scene.start('Title');
      },
    };
  }

  createNewCard(i) {
    const x = this.cardX(i);
    const box = this.cardBox(i).setFillStyle(0x263238);
    this.add.text(x, CARD_Y - 30, '+', { fontFamily: FONT, fontSize: '90px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(x, CARD_Y + 80, t('accounts.new'), { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    return {
      box,
      pick: () => {
        audio.play('click');
        // A different hero picture for each new player
        const hero = CHARACTERS[this.accounts.list.length % CHARACTERS.length].id;
        this.askName(t('accounts.defaultName', { number: this.accounts.list.length + 1 }), (text) => {
          addAccount(text, hero);
          this.scene.restart();
        });
      },
    };
  }

  select(index) {
    const next = Phaser.Math.Wrap(index, 0, this.cards.length);
    if (next !== this.selected) audio.play('click');
    this.selected = next;
    this.cards.forEach((card, i) => card.box.setStrokeStyle(i === next ? 7 : 4, i === next ? 0xffd23f : 0xffffff));
  }

  nextPicture(account) {
    const ids = CHARACTERS.map((c) => c.id);
    changeAccount(account.id, { hero: ids[(ids.indexOf(account.hero) + 1) % ids.length] });
    this.scene.restart();
  }

  // Typing a name: an HTML text box over the game (so iPads and iPhones show their keyboard)
  askName(start, done) {
    this.busy = true;
    const keyboard = this.input.keyboard;
    keyboard.enabled = false;
    keyboard.disableGlobalCapture();
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);z-index:50;font-family:Arial Black,Arial,sans-serif';
    box.innerHTML = `
      <form style="background:#37474f;border:5px solid #ffd23f;border-radius:16px;padding:24px;text-align:center;color:white">
        <div style="font-size:22px;margin-bottom:14px">${t('accounts.typeName')}</div>
        <input maxlength="${NAME_LENGTH}" style="font-size:26px;padding:8px;width:260px;border-radius:8px;border:none;text-align:center;font-family:inherit">
        <div style="margin-top:16px;display:flex;gap:12px;justify-content:center">
          <button type="button" data-cancel style="font-size:18px;padding:10px 18px;border-radius:10px;border:3px solid white;background:#263238;color:white;font-family:inherit">✖</button>
          <button type="submit" style="font-size:18px;padding:10px 26px;border-radius:10px;border:3px solid white;background:#2e7d32;color:white;font-family:inherit">${t('accounts.ok')}</button>
        </div>
      </form>`;
    const input = box.querySelector('input');
    input.value = start;
    const close = () => {
      box.remove();
      this.nameBox = null;
      keyboard.enabled = true;
      keyboard.enableGlobalCapture();
      this.busy = false;
    };
    box.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim().slice(0, NAME_LENGTH);
      close();
      audio.play('click');
      if (text) done(text);
    });
    box.querySelector('[data-cancel]').addEventListener('click', close);
    input.addEventListener('keydown', (event) => event.key === 'Escape' && close());
    document.body.appendChild(box);
    this.nameBox = box;
    input.focus();
    input.select();
  }

  // 🗑️ The capybara gets super sad ("Nooo, don't delete me!"), then: are you SURE?
  askDelete(account, hero, x) {
    this.busy = true;
    audio.play('error');
    this.tweens.killTweensOf(hero);
    hero.setTint(0x90a4ae);
    this.tweens.add({ targets: hero, scaleY: 2.2, y: CARD_Y - 30, duration: 400 });
    const tears = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        for (const side of [-1, 1]) {
          const tear = this.add.circle(x + side * 14 + 16, CARD_Y - 60, 4, 0x4fc3f7);
          this.tweens.add({ targets: tear, y: tear.y + 50, alpha: 0, duration: 600, onComplete: () => tear.destroy() });
        }
      },
    });
    // The speech bubble over the top of the card
    this.add.rectangle(x, CARD_Y - 110, CARD_WIDTH + 30, 46, 0xffffff).setStrokeStyle(3, 0x000000).setDepth(2);
    const words = this.add.text(x, CARD_Y - 110, t('accounts.noo'), { fontFamily: FONT, fontSize: '16px', color: '#000000' }).setOrigin(0.5).setDepth(2);
    words.setScale(Math.min(1, (CARD_WIDTH + 16) / words.width));

    this.time.delayedCall(1400, () => {
      const parts = [];
      const ui = (object) => (parts.push(object.setDepth(10)), object);
      ui(this.add.rectangle(480, 270, 960, 540, 0x000000, 0.55).setInteractive());
      ui(this.add.rectangle(480, 270, 460, 200, 0x37474f).setStrokeStyle(5, 0xffd23f));
      ui(this.add.text(480, 215, t('accounts.sure', { name: account.name }), { fontFamily: FONT, fontSize: '26px', color: '#ffffff', align: 'center' }).setOrigin(0.5));
      const keep = () => {
        tears.remove();
        this.scene.restart();
      };
      const button = (bx, color, label, action) => {
        ui(this.add.rectangle(bx, 300, 190, 50, color).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true }).on('pointerdown', action));
        const text = ui(this.add.text(bx, 300, label, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5));
        text.setScale(Math.min(1, 175 / text.width));
      };
      button(370, 0xc62828, t('accounts.yes'), () => {
        audio.play('explosion');
        deleteAccount(account.id);
        keep();
      });
      button(590, 0x2e7d32, t('accounts.no'), () => {
        audio.play('win');
        keep();
      });
      // Keys: ESC or ENTER keeps the player (deleting needs a tap or click on YES, so it can't happen by accident)
      this.input.keyboard.once('keydown-ESC', keep);
      this.input.keyboard.once('keydown-ENTER', keep);
    });
  }
}
