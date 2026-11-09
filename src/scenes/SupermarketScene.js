import Phaser from 'phaser';
import { loadSave, writeSave } from '../save.js';
import { t, setLanguage } from '../i18n.js';
import { audio } from '../audio.js';
import { Controls } from '../controls.js';
import { createHeroTextures, heroKey } from '../art/heroes.js';
import { createHatTextures, hatAnchor } from '../art/hats.js';
import { createBoltTexture } from '../art/bolt.js';
import { addBackButton } from '../backButton.js';
import { showTouchControls } from '../touch.js';
import { rainbowColor } from '../strawberry.js';
import { AISLES, itemName, owns, roomFor, missingNeed, buyItem, stockOf } from '../shopItems.js';

// THE SUPERMARKET (Ethan's design, 2026-11-09): the shop is a supermarket "like EDEKA". The SHOP button in the
// STORY menu brings you here. Walk your hero along the shelves and look for what you want: every item has a sign
// saying what it does. Press X (🛒 on touch) to put it in your shopping cart (press again to take it out),
// then walk to the checkout at the end, where the rainbow cat cashier scans everything (beep beep!) and you pay
// with your bolts. Aisles: power-ups, new hats, win dances (the list is in shopItems.js).
// Leave through the door you came in, with ESC, or the BACK button. Unpaid things go back on the shelves.

const FLOOR = 450;
const START_X = 170;
const ITEM_GAP = 150;
const AISLE_GAP = 170;
const SHELF_Y = 318; // the middle shelf, where the things for sale are
const REACH = 62; // how close you have to be to an item to pick it up
const RUN_SPEED = 280;
const JUMP_SPEED = 600;
const SCAN_MS = 550;
const FOOD = ['🍕', '🍇', '🍎', '🥛', '🥫', '🍌', '🧀', '🥕', '🍪', '🥨'];
const FONT = 'Arial Black, Arial';

export class SupermarketScene extends Phaser.Scene {
  constructor() {
    super('Supermarket');
  }

  create(data = {}) {
    this.save = loadSave();
    setLanguage(this.save.language);
    audio.setMuted(this.save.muted);
    audio.playMusic('menu');
    this.palette = this.save.keys.includes('world3') ? this.save.palette ?? 0 : 0;
    createHeroTextures(this, this.palette);
    createHatTextures(this);
    createBoltTexture(this);
    createShopTextures(this);
    this.heroId = data.hero && this.save.owned.includes(data.hero) ? data.hero : 'supa-capybara';
    this.cart = [];
    this.cartIcons = [];
    this.checkingOut = false;
    this.leaving = false;

    this.layOutShelves();
    this.width = this.checkoutX + 360;
    this.drawStore();
    this.createShelves();
    this.createCheckout();
    this.createHero();
    this.createInfoSign();
    this.createHud();

    this.physics.world.setBounds(0, 0, this.width, 540);
    this.cameras.main.setBounds(0, 0, this.width, 540);
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.input.keyboard.on('keydown-M', () => {
      this.save.muted = !this.save.muted;
      writeSave(this.save);
      audio.setMuted(this.save.muted);
    });
    if (this.save.touch) {
      const touch = showTouchControls(this.game.canvas.parentElement, { left: true, right: true, attack: '🛒' }, { jump: t('touch.jump') });
      this.events.once('shutdown', () => touch.destroy());
    }
  }

  // Where every item goes: aisle after aisle, then the checkout
  layOutShelves() {
    let x = START_X + 190;
    this.aisles = AISLES.map((aisle) => {
      const fromX = x;
      const items = aisle.items.map((item) => {
        const spot = { item, x };
        x += ITEM_GAP;
        return spot;
      });
      const toX = x - ITEM_GAP;
      x += AISLE_GAP;
      return { ...aisle, fromX, toX, items };
    });
    this.spots = this.aisles.flatMap((aisle) => aisle.items);
    this.checkoutX = x + 120;
  }

  // ---------- The store ----------

  drawStore() {
    const g = this.add.graphics();
    // Wall, with a green stripe
    g.fillStyle(0xfff8e1);
    g.fillRect(0, 0, this.width, FLOOR);
    g.fillStyle(0x43a047);
    g.fillRect(0, 380, this.width, 16);
    // Ceiling lights
    for (let x = 100; x < this.width; x += 260) {
      g.fillStyle(0xeeeeee);
      g.fillRect(x, 0, 140, 12);
      g.fillStyle(0xffffff, 0.35);
      g.fillTriangle(x, 12, x + 140, 12, x + 70, 120);
    }
    // Checkered floor
    for (let x = 0; x < this.width; x += 40) {
      for (let row = 0; row < 3; row++) {
        g.fillStyle((x / 40 + row) % 2 ? 0xe0e0e0 : 0xfafafa);
        g.fillRect(x, FLOOR + row * 30, 40, 30);
      }
    }
    // The sliding doors you came in through (walk back into them to leave)
    g.fillStyle(0x90a4ae);
    g.fillRect(20, 200, 150, FLOOR - 200);
    g.fillStyle(0xb3e5fc, 0.8);
    g.fillRect(28, 210, 64, FLOOR - 210);
    g.fillRect(98, 210, 64, FLOOR - 210);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(36, 220, 8, 120);
    g.fillRect(106, 220, 8, 120);
    this.add.text(95, 186, `🚪 ${t('shop.exit')}`, { fontFamily: FONT, fontSize: '16px', color: '#2e7d32' }).setOrigin(0.5);
    // The store's name over the door
    this.add.text(95, 60, `🛒 ${t('shop.title')}`, { fontFamily: FONT, fontSize: '26px', color: '#ffd23f' }).setStroke('#c62828', 7).setOrigin(0, 0.5);

    this.solids = this.physics.add.staticGroup();
    this.solids.add(this.add.zone(0, FLOOR, this.width, 100).setOrigin(0, 0));
  }

  createShelves() {
    this.spotLooks = new Map();
    for (const aisle of this.aisles) {
      const left = aisle.fromX - 70;
      const width = aisle.toX - aisle.fromX + 140;
      const g = this.add.graphics();
      // The shelf unit: wooden boards on a white frame
      g.fillStyle(0xeceff1);
      g.fillRect(left, 160, width, FLOOR - 160);
      g.lineStyle(4, 0xb0bec5);
      g.strokeRect(left, 160, width, FLOOR - 160);
      for (const y of [230, SHELF_Y + 34, 420]) {
        g.fillStyle(0xa1887f);
        g.fillRect(left, y, width, 10);
      }
      // Funny food on the top and bottom shelves, just for fun
      for (let x = left + 26; x < left + width - 10; x += 36) {
        this.add.text(x, 214, Phaser.Math.RND.pick(FOOD), { fontSize: '24px' }).setOrigin(0.5);
        this.add.text(x, 404, Phaser.Math.RND.pick(FOOD), { fontSize: '24px' }).setOrigin(0.5);
      }
      // The aisle's sign hanging from the ceiling
      const centerX = left + width / 2;
      g.lineStyle(3, 0x616161);
      g.lineBetween(centerX - 60, 0, centerX - 60, 100);
      g.lineBetween(centerX + 60, 0, centerX + 60, 100);
      const sign = this.add.text(centerX, 120, t(`shop.aisle.${aisle.id}`), { fontFamily: FONT, fontSize: '22px', color: '#ffffff', backgroundColor: '#1565c0', padding: { x: 14, y: 6 } }).setOrigin(0.5);
      sign.setScale(Math.min(1, (width - 20) / sign.width));

      for (const spot of aisle.items) {
        const glow = this.add.circle(spot.x, SHELF_Y, 36, 0xffeb3b, 0.6).setVisible(false);
        const icon = this.itemIcon(spot.item, spot.x, SHELF_Y);
        const tag = this.add.text(spot.x, SHELF_Y + 54, '', { fontFamily: FONT, fontSize: '13px', color: '#000000', backgroundColor: '#ffd23f', padding: { x: 5, y: 2 } }).setOrigin(0.5);
        this.spotLooks.set(spot, { glow, icon, tag });
        this.updateTag(spot);
      }
    }
  }

  itemIcon(item, x, y, small = false) {
    if (item.kind === 'hat') return this.add.image(x, y, `hat-${item.id}`).setScale(small ? 1 : 2.4);
    return this.add.text(x, y, item.icon, { fontSize: small ? '18px' : '40px' }).setOrigin(0.5);
  }

  // The price tag under an item (or ✓ once it's yours)
  updateTag(spot) {
    const { tag, icon } = this.spotLooks.get(spot);
    const item = spot.item;
    const have = owns(this.save, item);
    tag.setText(have ? `✓ ${t('menu.owned')}` : `${item.price} ⚡`);
    tag.setBackgroundColor(have ? '#b9f6ca' : '#ffd23f');
    icon.setAlpha(this.cart.includes(item) && !item.usedUp ? 0.3 : 1); // (it's in your cart)
  }

  // ---------- The checkout and the rainbow cat cashier ----------

  createCheckout() {
    const x = this.checkoutX;
    const g = this.add.graphics().setDepth(3);
    // The cat stands behind the counter
    this.catFur = this.add.image(x + 40, FLOOR - 160, 'shop-cat-fur').setDepth(2);
    this.catFace = this.add.image(x + 40, FLOOR - 160, 'shop-cat-face').setDepth(2.1);
    this.tweens.add({ targets: [this.catFur, this.catFace], y: '-=6', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Counter with a conveyor belt, a scanner and the cash register
    g.fillStyle(0x546e7a);
    g.fillRect(x - 120, FLOOR - 90, 260, 90);
    g.fillStyle(0x263238);
    g.fillRect(x - 120, FLOOR - 98, 200, 10);
    g.fillStyle(0xd32f2f);
    g.fillRect(x - 10, FLOOR - 104, 30, 8); // the scanner's red light
    g.fillStyle(0x37474f);
    g.fillRect(x + 90, FLOOR - 140, 50, 50);
    g.fillStyle(0x76ff03);
    g.fillRect(x + 96, FLOOR - 134, 38, 18);
    this.add.text(x, 150, `🛒 ${t('shop.checkout')}`, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', backgroundColor: '#c62828', padding: { x: 14, y: 6 } }).setOrigin(0.5);
    this.scanX = x + 5;
  }

  catSays(text, ms = 2600) {
    this.catBubble?.destroy();
    const bubble = this.add.text(this.checkoutX + 40, FLOOR - 270, text, { fontFamily: FONT, fontSize: '18px', color: '#000000', backgroundColor: '#ffffff', padding: { x: 10, y: 6 }, align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5).setDepth(8);
    this.catBubble = bubble;
    this.time.delayedCall(ms, () => bubble.destroy());
  }

  // ---------- Your hero and the cart ----------

  createHero() {
    const look = heroKey(this.heroId, this.palette);
    this.look = look;
    this.hero = this.physics.add.sprite(START_X, FLOOR - 40, `${look}-idle`).setScale(1.5).setDepth(5);
    this.hero.body.setSize(44, 34).setOffset(10, 13);
    this.hero.setCollideWorldBounds(true);
    this.physics.add.collider(this.hero, this.solids);
    this.controls = new Controls(this, 'solo');
    this.hat = this.save.wearing?.[this.heroId] ?? null;
    if (this.hat) this.hatSprite = this.add.image(0, 0, `hat-${this.hat}`).setScale(1.5).setDepth(6).setOrigin(0.5, this.hat === 'shades' ? 0.5 : 1);
    this.cartSprite = this.add.image(START_X + 60, FLOOR - 28, 'shop-cart').setDepth(4);
  }

  createHud() {
    const fixed = (object) => object.setScrollFactor(0).setDepth(10);
    fixed(this.add.image(800, 30, 'bolt').setScale(1.3));
    this.boltText = fixed(this.add.text(822, 12, String(this.save.bolts), { fontFamily: FONT, fontSize: '28px', color: '#ffd23f' }).setStroke('#000000', 6));
    this.cartText = fixed(this.add.text(480, 26, '', { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setStroke('#000000', 5).setOrigin(0.5));
    this.hintText = fixed(this.add.text(480, 524, t('shop.hint'), { fontFamily: 'Arial', fontSize: '15px', color: '#ffffff' }).setStroke('#000000', 4).setOrigin(0.5, 1));
    if (this.save.touch) this.hintText.setVisible(false);
    for (const part of addBackButton(this, 76, 30, () => this.leave())) fixed(part);
    this.updateCartText();
  }

  updateCartText() {
    const total = this.cart.reduce((sum, item) => sum + item.price, 0);
    this.cartText.setText(this.cart.length ? t('shop.cart', { count: this.cart.length, total }) : t('shop.cartEmpty'));
    this.cartText.setColor(total > this.save.bolts ? '#ff8a80' : '#ffffff');
  }

  // The things in the cart, piled up in the basket
  drawCart() {
    for (const icon of this.cartIcons) icon.destroy();
    this.cartIcons = this.cart.map((item) => this.itemIcon(item, 0, 0, true).setDepth(4.1));
  }

  // ---------- The sign that says what an item is ----------

  createInfoSign() {
    this.info = this.add.container(0, 0).setDepth(9).setVisible(false);
    this.infoBox = this.add.rectangle(0, 0, 300, 120, 0x1b1b2f, 0.92).setStrokeStyle(4, 0xffd23f);
    this.infoName = this.add.text(0, -40, '', { fontFamily: FONT, fontSize: '20px', color: '#ffd23f' }).setOrigin(0.5);
    this.infoText = this.add.text(0, -4, '', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5);
    this.infoStatus = this.add.text(0, 38, '', { fontFamily: FONT, fontSize: '14px', color: '#b9f6ca', align: 'center' }).setOrigin(0.5);
    this.info.add([this.infoBox, this.infoName, this.infoText, this.infoStatus]);
  }

  showInfo(spot) {
    if (!spot) return this.info.setVisible(false);
    const item = spot.item;
    this.info.setVisible(true).setPosition(Phaser.Math.Clamp(spot.x, this.cameras.main.scrollX + 160, this.cameras.main.scrollX + 800), 150);
    const count = item.usedUp ? stockOf(this.save, item) : 0;
    this.infoName.setText(`${itemName(t, item)}  ${item.price} ⚡`);
    this.infoName.setScale(Math.min(1, 280 / this.infoName.width));
    this.infoText.setText(t(`shopInfo.${item.id}`));
    let status;
    let color = '#b9f6ca';
    if (owns(this.save, item)) status = `✓ ${t('shop.haveIt')}`;
    else if (this.cart.includes(item) && !item.usedUp) status = t('shop.takeOut');
    else if (missingNeed(this.save, item, this.cart)) {
      status = t('menu.buyFirst', { name: t(`powerUp.${item.needs}`) });
      color = '#ff8a80';
    } else status = t('shop.putIn');
    if (count) status = `${t('shop.youHave', { count })}   ${status}`;
    this.infoStatus.setText(status).setColor(color);
    this.infoStatus.setScale(Math.min(1, 280 / this.infoStatus.width));
    const height = 90 + this.infoText.height;
    this.infoBox.setSize(300, height);
    this.infoBox.setPosition(0, 0).setOrigin(0.5);
    this.infoName.setY(-height / 2 + 18);
    this.infoStatus.setY(height / 2 - 18);
  }

  nearestSpot() {
    let best = null;
    for (const spot of this.spots) {
      const distance = Math.abs(spot.x - this.hero.x);
      if (distance < REACH && (!best || distance < Math.abs(best.x - this.hero.x))) best = spot;
    }
    return best;
  }

  // X: put the item in the cart, or take it back out
  pickUp(spot) {
    const item = spot.item;
    if (owns(this.save, item)) {
      audio.play('error');
      return;
    }
    if (this.cart.includes(item) && !item.usedUp) {
      this.cart.splice(this.cart.indexOf(item), 1);
      // Whatever needed it comes out too (Multi Direction without the Shield)
      this.cart = this.cart.filter((other) => !missingNeed(this.save, other, this.cart));
      audio.play('click');
    } else if (missingNeed(this.save, item, this.cart)) {
      audio.play('error');
      this.cameras.main.shake(120, 0.004);
      return;
    } else if (roomFor(this.save, item, this.cart) <= 0) {
      audio.play('error');
      this.flash(t('mega.full', { count: stockOf(this.save, item) + this.cart.filter((c) => c === item).length * (item.pack ?? 1) }));
      return;
    } else {
      this.cart.push(item);
      audio.play('bolt');
      // It flies from the shelf into the cart
      const flyer = this.itemIcon(item, spot.x, SHELF_Y).setDepth(7);
      this.tweens.add({ targets: flyer, x: this.cartSprite.x, y: this.cartSprite.y - 20, scale: flyer.scale * 0.4, duration: 300, ease: 'Quad.easeIn', onComplete: () => flyer.destroy() });
    }
    for (const other of this.spots) this.updateTag(other);
    this.drawCart();
    this.updateCartText();
  }

  flash(text, color = '#ff8a80') {
    const message = this.add.text(480, 90, text, { fontFamily: FONT, fontSize: '24px', color }).setStroke('#000000', 6).setOrigin(0.5).setScrollFactor(0).setDepth(11);
    this.tweens.add({ targets: message, alpha: 0, y: 70, delay: 1300, duration: 400, onComplete: () => message.destroy() });
  }

  // ---------- Paying ----------

  // The cat scans everything (beep! beep!), then you pay for whatever your bolts can buy.
  startCheckout() {
    this.checkingOut = true;
    this.hero.setVelocityX(0);
    this.showInfo(null);
    const items = [...this.cart];
    let total = 0;
    const totalText = this.add.text(this.checkoutX + 115, FLOOR - 166, '', { fontFamily: FONT, fontSize: '18px', color: '#000000', backgroundColor: '#76ff03', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(8);
    this.catSays(t('shop.hello'), SCAN_MS * items.length + 400);
    items.forEach((item, i) => {
      this.time.delayedCall(400 + i * SCAN_MS, () => {
        audio.play('beep');
        this.cart.splice(this.cart.indexOf(item), 1);
        this.drawCart();
        total += item.price;
        totalText.setText(`${total} ⚡`);
        const scanned = this.itemIcon(item, this.scanX, FLOOR - 120, false).setDepth(8);
        this.tweens.add({ targets: scanned, y: FLOOR - 200, alpha: 0, duration: SCAN_MS * 1.6, onComplete: () => scanned.destroy() });
        const beep = this.add.text(this.scanX, FLOOR - 150, t('shop.beep'), { fontFamily: FONT, fontSize: '16px', color: '#d32f2f' }).setOrigin(0.5).setDepth(8);
        this.tweens.add({ targets: beep, y: beep.y - 30, alpha: 0, duration: 500, onComplete: () => beep.destroy() });
      });
    });
    this.time.delayedCall(400 + items.length * SCAN_MS + 200, () => {
      const bought = [];
      const tooExpensive = [];
      for (const item of items) {
        // (Multi Direction can only be bought if the Shield was)
        if (this.save.bolts >= item.price && !missingNeed(this.save, item, [])) {
          buyItem(this.save, item);
          bought.push(item);
        } else tooExpensive.push(item);
      }
      writeSave(this.save);
      this.boltText.setText(String(this.save.bolts));
      totalText.destroy();
      if (bought.length) audio.play('buy');
      if (tooExpensive.length) {
        if (!bought.length) audio.play('error');
        this.catSays(t('shop.notEnough', { names: tooExpensive.map((item) => itemName(t, item)).join(', ') }), 3500);
      } else {
        this.catSays(t('shop.thanks'));
      }
      for (const spot of this.spots) this.updateTag(spot);
      this.updateCartText();
      this.checkingOut = false;
    });
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Menu');
  }

  // ---------- Every frame ----------

  update() {
    const hero = this.hero;
    const body = hero.body;
    const c = this.controls;
    const onGround = body.blocked.down;
    if (!this.checkingOut) {
      const move = (c.isDown('right') ? 1 : 0) - (c.isDown('left') ? 1 : 0);
      hero.setVelocityX(move * RUN_SPEED);
      if (move) hero.setFlipX(move < 0);
      if (onGround && c.justPressed('jump')) {
        hero.setVelocityY(-JUMP_SPEED);
        audio.play('jump');
      }
      const spot = this.nearestSpot();
      if (c.justPressed('attack') && spot) this.pickUp(spot);
      this.showInfo(spot);
      for (const s of this.spots) this.spotLooks.get(s).glow.setVisible(s === spot);
      if (this.cart.length && hero.x > this.checkoutX - 150) this.startCheckout();
    } else {
      c.justPressed('jump');
      c.justPressed('attack');
    }
    // Don't walk through the counter
    if (hero.x > this.checkoutX - 140) hero.x = this.checkoutX - 140;
    // Back out through the door
    if (hero.x < 60 && body.velocity.x < 0) this.leave();

    if (!onGround) hero.setTexture(`${this.look}-jump`);
    else if (body.velocity.x !== 0) hero.anims.play(`${this.look}-run`, true);
    else hero.setTexture(`${this.look}-idle`);

    // The cart rolls in front of you, with your things piled in it
    const dir = hero.flipX ? -1 : 1;
    this.cartSprite.setPosition(hero.x + dir * 62, FLOOR - 28).setFlipX(dir < 0);
    this.cartIcons.forEach((icon, i) => icon.setPosition(this.cartSprite.x - 16 + (i % 3) * 16, FLOOR - 52 - Math.floor(i / 3) * 14));
    if (this.hatSprite) {
      const anchor = hatAnchor(this.heroId, this.hat, hero.scaleX);
      this.hatSprite.setPosition(hero.x + anchor.x * dir, hero.y + anchor.y).setFlipX(dir < 0);
    }
    // The cat's fur shimmers through the rainbow
    const now = this.time.now;
    this.catFur.setTint(rainbowColor(now), rainbowColor(now + 150), rainbowColor(now + 300), rainbowColor(now + 450));
  }
}

// The shopping cart and the rainbow cat (fur: white, tinted rainbow in the game; face and apron: on top)
function createShopTextures(scene) {
  if (scene.textures.exists('shop-cart')) return;
  const g = scene.make.graphics({ add: false });
  // Cart: a wire basket, handle on the left (you push it from behind), two wheels
  g.lineStyle(3, 0x78909c);
  g.lineBetween(2, 6, 12, 10);
  g.fillStyle(0x90a4ae, 0.5);
  g.fillPoints([{ x: 10, y: 10 }, { x: 78, y: 10 }, { x: 70, y: 38 }, { x: 18, y: 38 }], true);
  g.lineStyle(2, 0x607d8b);
  g.strokePoints([{ x: 10, y: 10 }, { x: 78, y: 10 }, { x: 70, y: 38 }, { x: 18, y: 38 }], true);
  for (let x = 22; x < 74; x += 10) g.lineBetween(x, 10, x - 2, 38);
  g.lineBetween(14, 24, 74, 24);
  g.fillStyle(0x263238);
  g.fillCircle(24, 46, 5);
  g.fillCircle(64, 46, 5);
  g.fillStyle(0xd32f2f);
  g.fillRect(0, 2, 6, 6); // red handle grip
  g.generateTexture('shop-cart', 82, 52);
  g.clear();

  // Cat fur (white, so the rainbow tint shows): head with ears, body, paws on the counter
  g.fillStyle(0xffffff);
  g.fillEllipse(60, 120, 92, 110); // body
  g.fillCircle(60, 52, 40); // head
  g.fillTriangle(24, 36, 30, 2, 52, 22); // ears
  g.fillTriangle(96, 36, 90, 2, 68, 22);
  g.fillEllipse(22, 150, 26, 18); // paws
  g.fillEllipse(98, 150, 26, 18);
  g.generateTexture('shop-cat-fur', 120, 170);
  g.clear();

  // Face and apron (not tinted)
  g.fillStyle(0xf48fb1);
  g.fillTriangle(31, 30, 34, 10, 46, 22);
  g.fillTriangle(89, 30, 86, 10, 74, 22);
  g.fillStyle(0x000000);
  g.fillEllipse(44, 50, 12, 16);
  g.fillEllipse(76, 50, 12, 16);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 46, 3);
  g.fillCircle(78, 46, 3);
  g.fillStyle(0xf06292);
  g.fillTriangle(55, 62, 65, 62, 60, 68); // nose
  g.lineStyle(2, 0x000000);
  g.beginPath();
  g.arc(54, 68, 6, 0, Math.PI, false);
  g.strokePath();
  g.beginPath();
  g.arc(66, 68, 6, 0, Math.PI, false);
  g.strokePath();
  g.lineStyle(1.5, 0x424242); // whiskers
  for (const side of [-1, 1]) {
    g.lineBetween(60 + side * 14, 64, 60 + side * 44, 58);
    g.lineBetween(60 + side * 14, 68, 60 + side * 44, 70);
  }
  g.fillStyle(0xff8a80, 0.7); // pink cheeks
  g.fillCircle(36, 64, 6);
  g.fillCircle(84, 64, 6);
  // The shop apron, with a name tag
  g.fillStyle(0x1565c0);
  g.fillRoundedRect(30, 96, 60, 70, 10);
  g.lineStyle(3, 0x1565c0);
  g.lineBetween(36, 98, 46, 84);
  g.lineBetween(84, 98, 74, 84);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(42, 110, 36, 14, 3);
  g.fillStyle(0xd32f2f);
  g.fillCircle(48, 117, 3);
  g.generateTexture('shop-cat-face', 120, 170);
  g.destroy();
}
