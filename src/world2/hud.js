// World 2's screen display (hearts, bolts, crystals, powers, boss health, big messages), made with HTML on top of the 3D view.

const STYLE = `
  .w2-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Arial Black', Arial, sans-serif; color: #fff;
    text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; user-select: none; }
  .w2-hud > div { position: absolute; }
  .w2-title { top: 14px; left: 16px; font-size: 28px; }
  .w2-hearts { top: 52px; left: 16px; font-size: 26px; color: #ff3355; letter-spacing: 2px; }
  .w2-hearts .lost { opacity: 0.25; }
  .w2-difficulty { top: 88px; left: 16px; font-size: 14px; }
  .w2-hint { top: 14px; width: 100%; text-align: center; font-size: 18px; }
  .w2-power { top: 40px; width: 100%; text-align: center; font-size: 18px; color: #b9f6ca; }
  .w2-bolts { top: 14px; right: 18px; font-size: 28px; color: #ffd23f; }
  .w2-crystals { top: 52px; right: 18px; font-size: 22px; color: #84ffff; }
  .w2-boss { top: 76px; left: 50%; width: 400px; margin-left: -200px; text-align: center; font-size: 16px; display: none; }
  .w2-boss-bar { margin-top: 4px; height: 14px; background: #000; border: 3px solid #000; }
  .w2-boss-fill { height: 100%; width: 100%; background: #ff3a3a; }
  .w2-message { top: 32%; width: 100%; text-align: center; font-size: 56px; color: #ffd23f; }
  .w2-sub { top: 46%; width: 100%; text-align: center; font-size: 24px; }
  .w2-controls { bottom: 12px; left: 16px; font-size: 14px; }
  .w2-menu { bottom: 12px; right: 16px; font-size: 14px; }
  .w2-hearts2 { top: 88px; right: 18px; font-size: 26px; color: #4fc3f7; letter-spacing: 2px; display: none; }
  .w2-hearts2 .lost { opacity: 0.25; }
  .w2-split { top: 0; bottom: 0; left: 50%; width: 4px; margin-left: -2px; background: #000; display: none; }
`;

export class Hud {
  // itemIcon: what the collectible counter shows (💎 crystals in World 2, 🧩 puzzle pieces in Adventure).
  constructor(container, { title, difficulty, hint, controls, menu, maxHearts, crystals, bossName, itemIcon = '💎' }) {
    this.root = document.createElement('div');
    this.root.className = 'w2-hud';
    this.root.innerHTML = `
      <style>${STYLE}</style>
      <div class="w2-title">${title}</div>
      <div class="w2-hearts"></div>
      <div class="w2-difficulty">${difficulty}</div>
      <div class="w2-hint">${hint}</div>
      <div class="w2-power"></div>
      <div class="w2-bolts"></div>
      <div class="w2-crystals"></div>
      <div class="w2-boss"><span class="w2-boss-name">${bossName}</span><div class="w2-boss-bar"><div class="w2-boss-fill"></div></div></div>
      <div class="w2-message"></div>
      <div class="w2-sub"></div>
      <div class="w2-controls">${controls}</div>
      <div class="w2-menu">${menu}</div>
      <div class="w2-hearts2"></div>
      <div class="w2-split"></div>
    `;
    container.appendChild(this.root);
    this.maxHearts = maxHearts;
    this.totalCrystals = crystals;
    this.itemIcon = itemIcon;
    this.el = (name) => this.root.querySelector(`.w2-${name}`);
  }

  // With touch buttons on screen, the keyboard hints at the bottom would be under them.
  hideKeyboardHints() {
    this.el('controls').style.display = 'none';
    this.el('menu').style.display = 'none';
  }

  setHearts(hearts) {
    this.el('hearts').innerHTML = Array.from({ length: this.maxHearts }, (_, i) => `<span class="${i < hearts ? '' : 'lost'}">❤</span>`).join('');
  }

  // Two players (split screen): a line down the middle, and player 2's hearts (blue) on the right.
  showTwoPlayers() {
    this.el('hearts2').style.display = 'block';
    this.el('split').style.display = 'block';
  }

  setHearts2(hearts) {
    this.el('hearts2').innerHTML = Array.from({ length: this.maxHearts }, (_, i) => `<span class="${i < hearts ? '' : 'lost'}">❤</span>`).join('');
  }

  setBolts(bolts) {
    this.el('bolts').textContent = `⚡ ${bolts}`;
  }

  setCrystals(count) {
    this.el('crystals').textContent = `${this.itemIcon} ${count} / ${this.totalCrystals}`;
  }

  // Any text in the collectibles corner (the Cube Islands show food and babies there).
  setItems(text) {
    this.el('crystals').textContent = text;
  }

  setPower(text) {
    this.el('power').textContent = text;
  }

  setBossName(name) {
    this.el('boss-name').textContent = name;
  }

  hideBoss() {
    this.el('boss').style.display = 'none';
  }

  showBoss(fraction) {
    this.el('boss').style.display = 'block';
    this.el('boss-fill').style.width = `${Math.max(0, fraction) * 100}%`;
  }

  // Big text in the middle. Clears itself after `ms` (0 = stays).
  message(text, sub = '', ms = 2500) {
    clearTimeout(this.messageTimer);
    this.el('message').textContent = text;
    this.el('sub').textContent = sub;
    if (ms) {
      this.messageTimer = setTimeout(() => {
        this.el('message').textContent = '';
        this.el('sub').textContent = '';
      }, ms);
    }
  }

  destroy() {
    clearTimeout(this.messageTimer);
    this.root.remove();
  }
}
