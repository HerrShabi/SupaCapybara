import { t } from '../i18n.js';
import { LAP_CHOICES } from './RaceWorld.js';

// CAPY CIRCUIT's screen display, in HTML on top of the 3D view: lap, time, your place, everybody's places,
// a mini map, big messages, the "how many laps?" menu and the results.

const STYLE = `
  .rc-hud { position: absolute; inset: 0; pointer-events: none; font-family: 'Arial Black', Arial, sans-serif; color: #fff;
    text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; user-select: none; }
  .rc-hud > div, .rc-hud > canvas, .rc-hud > button { position: absolute; }
  .rc-lap { top: 12px; left: 16px; font-size: 28px; color: #ffd23f; }
  .rc-time { top: 48px; left: 16px; font-size: 18px; }
  .rc-list { top: 78px; left: 16px; font-size: 14px; line-height: 20px; }
  .rc-list .me { color: #ffd23f; }
  .rc-rocket { bottom: 16px; left: 50%; transform: translateX(-50%); font-size: 20px; display: none; }
  .rc-place { top: 52px; right: 18px; font-size: 54px; color: #ffd23f; text-align: right; }
  .rc-map { top: 124px; right: 14px; width: 150px; height: 150px; background: rgba(0,0,0,0.25); border-radius: 12px; }
  .rc-back { top: 10px; right: 14px; pointer-events: auto; font: 16px 'Arial Black', Arial; color: #fff; background: #1565c0;
    border: 3px solid #ffd23f; border-radius: 8px; padding: 4px 12px; cursor: pointer; }
  .rc-message { top: 30%; width: 100%; text-align: center; font-size: 64px; color: #ffd23f; }
  .rc-sub { top: 46%; width: 100%; text-align: center; font-size: 34px; }
  .rc-panel { top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(13, 27, 62, 0.88); border: 4px solid #ffd23f;
    border-radius: 18px; padding: 18px 30px; text-align: center; pointer-events: auto; display: none; min-width: 360px; }
  .rc-panel h1 { margin: 0 0 6px; font-size: 38px; color: #ffd23f; }
  .rc-panel p { margin: 8px 0; font-size: 18px; }
  .rc-panel .small { font-size: 13px; color: #cfd8dc; }
  .rc-panel button { font: 24px 'Arial Black', Arial; color: #fff; background: #2c2c54; border: 3px solid #fff; border-radius: 10px;
    margin: 6px; padding: 6px 18px; cursor: pointer; text-shadow: inherit; }
  .rc-panel button.on { background: #2e7d32; border-color: #ffd23f; transform: scale(1.12); }
  .rc-panel.results { top: auto; bottom: 10px; transform: translateX(-50%); white-space: nowrap; padding: 6px 16px; }
  .rc-panel.results .result { font-size: 28px; color: #ffd23f; vertical-align: middle; margin-right: 10px; }
  .rc-panel.results button { font-size: 18px; padding: 4px 12px; }
  .rc-panel button.go { background: #d8343f; border-color: #ffd23f; font-size: 28px; }
`;

const PLACE_COLORS = ['#ffd23f', '#e0e0e0', '#ff9e57', '#90caf9'];

export class RaceHud {
  constructor(container, track, { onLaps, onStart, onAgain, onBack }) {
    this.root = document.createElement('div');
    this.root.className = 'rc-hud';
    this.root.innerHTML = `
      <style>${STYLE}</style>
      <div class="rc-lap"></div>
      <div class="rc-time"></div>
      <div class="rc-list"></div>
      <div class="rc-place"></div>
      <div class="rc-rocket"></div>
      <canvas class="rc-map" width="150" height="150"></canvas>
      <button class="rc-back">⬅ ${t('race.back')}</button>
      <div class="rc-message"></div>
      <div class="rc-sub"></div>
      <div class="rc-panel"></div>
    `;
    container.appendChild(this.root);
    this.el = (name) => this.root.querySelector(`.rc-${name}`);
    this.el('back').addEventListener('click', onBack);
    this.callbacks = { onLaps, onStart, onAgain, onBack };
    this.track = track;
    this.drawMapBase();
    this.el('map').style.display = 'none'; // (shown when the race starts: showMap)
  }

  showMap() {
    this.el('map').style.display = 'block';
  }

  // The track from above, drawn once; the cars are dots on top of it every frame.
  drawMapBase() {
    const points = this.track.samples.map((sample) => sample.pos);
    const xs = points.map((p) => p.x);
    const zs = points.map((p) => p.z);
    const minX = Math.min(...xs);
    const minZ = Math.min(...zs);
    const size = Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ);
    const scale = 130 / size;
    // (x is flipped, so the map turns the same way as the track looks from above)
    this.toMap = (p) => [140 - (p.x - minX) * scale, 140 - (p.z - minZ) * scale];
    this.mapBase = document.createElement('canvas');
    this.mapBase.width = this.mapBase.height = 150;
    const ctx = this.mapBase.getContext('2d');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(...this.toMap(p)) : ctx.moveTo(...this.toMap(p))));
    ctx.closePath();
    ctx.stroke();
    const [sx, sy] = this.toMap(points[0]);
    ctx.fillStyle = '#000';
    ctx.fillRect(sx - 5, sy - 2, 10, 4);
  }

  update({ lap, laps, time, place, order, player, cars }) {
    this.el('lap').textContent = t('race.lapShort', { lap, laps });
    const seconds = time % 60;
    this.el('time').textContent = `⏱ ${Math.floor(time / 60)}:${seconds < 10 ? '0' : ''}${seconds.toFixed(1)}`;
    const placeText = t(`race.place${place + 1}`);
    if (this.lastPlace !== placeText) {
      this.lastPlace = placeText;
      this.el('place').textContent = placeText;
      this.el('place').style.color = PLACE_COLORS[place];
    }
    const list = order.map((car, i) => `<div class="${car === player ? 'me' : ''}">${i + 1}. ${car.name}</div>`).join('');
    if (list !== this.lastList) {
      this.lastList = list;
      this.el('list').innerHTML = list;
    }
    const ctx = this.el('map').getContext('2d');
    ctx.clearRect(0, 0, 150, 150);
    ctx.drawImage(this.mapBase, 0, 0);
    for (const car of [...cars].reverse()) {
      const [x, y] = this.toMap(car.group.position);
      ctx.fillStyle = car === player ? '#ffd23f' : '#ff1744';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, car === player ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // The rocket spoiler's light: ready (C) or charging
  setRocket(ready) {
    const el = this.el('rocket');
    el.style.display = 'block';
    const text = ready ? t('race.rocketReady') : '🚀 …';
    if (el.textContent !== text) el.textContent = text;
    el.style.opacity = ready ? 1 : 0.5;
  }

  // A big message in the middle for `ms` (or until the next one). sub: a smaller line under it.
  message(text, ms = 800, sub = '') {
    this.el('message').textContent = text;
    this.el('sub').textContent = sub;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      this.el('message').textContent = '';
      this.el('sub').textContent = '';
    }, ms);
  }

  panel(html) {
    const panel = this.el('panel');
    panel.innerHTML = html;
    panel.style.display = 'block';
    return panel;
  }

  hidePanel() {
    this.el('panel').style.display = 'none';
  }

  showLapMenu(laps) {
    const panel = this.panel(`
      <h1>🦫🏁 CAPY CIRCUIT</h1>
      <p>${t('race.howManyLaps')}</p>
      <div>${LAP_CHOICES.map((n) => `<button data-laps="${n}" class="${n === laps ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div><button class="go">${t('race.start')}</button></div>
      <p class="small">${t('race.controls')}</p>
    `);
    panel.querySelectorAll('[data-laps]').forEach((button) => button.addEventListener('click', () => this.callbacks.onLaps(Number(button.dataset.laps))));
    panel.querySelector('.go').addEventListener('click', () => this.callbacks.onStart());
  }

  showResults(placeText, prize, won) {
    this.el('lap').textContent = '';
    this.el('time').textContent = '';
    this.el('list').textContent = '';
    this.el('place').textContent = '';
    this.el('map').style.display = 'none';
    this.el('rocket').style.display = 'none';
    // A slim bar at the bottom, so you can see the podium
    const panel = this.panel(`
      <span class="result">${won ? '🏆 ' : ''}${placeText} &nbsp; +${prize} ⚡</span>
      <button class="go again">🔁 ${t('race.again')}</button><button class="leave">⬅ ${t('race.back')}</button>
    `);
    panel.classList.add('results');
    panel.querySelector('.again').addEventListener('click', () => this.callbacks.onAgain());
    panel.querySelector('.leave').addEventListener('click', () => this.callbacks.onBack());
  }

  destroy() {
    clearTimeout(this.messageTimer);
    this.root.remove();
  }
}
