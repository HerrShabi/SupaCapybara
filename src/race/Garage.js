import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { writeSave } from '../save.js';
import { makeHero } from '../world2/models.js';
import { makeTree } from '../adventure/models.js';
import { PARTS, savedCar, ownsSpoiler, buildCar } from './cars.js';
import { makeBabyCapybara } from './models.js';

// CAPY CIRCUIT's garage (Ethan's drawing, concept-art/garage.jpg): the first screen after the 🏁 button.
// A garage room with the door rolled half up, your car on a turntable that spins slowly by itself (like the cake
// wall in "Is It Cake?"), Baby Capybara standing next to it just looking, and four boxes on the right:
// body, color, wheels, spoiler. ▲ ▼ flip the choices in a box, ◀ ▶ go to the next box, ENTER = done.
// Spoilers have a 🔒 until you buy them (once, with ⚡). The car is saved (save.raceCar, save.raceSpoilers).
// RaceWorld runs it while its state is 'garage': keyDown(code), update(dt), render(renderer).

const BOXES = ['body', 'color', 'wheels', 'spoiler'];
const SPIN = 0.45; // turntable speed (radians a second)

const STYLE = `
  .gr { position: absolute; inset: 0; pointer-events: none; font-family: 'Arial Black', Arial, sans-serif; color: #fff;
    text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; user-select: none; }
  .gr button { font-family: inherit; color: #fff; cursor: pointer; pointer-events: auto; text-shadow: inherit; }
  .gr-title { position: absolute; top: 12px; left: 16px; font-size: 30px; color: #ffd23f; }
  .gr-bolts { position: absolute; top: 52px; left: 16px; font-size: 22px; color: #ffd23f; }
  .gr-back { position: absolute; top: 86px; left: 16px; font-size: 15px; background: #1565c0; border: 3px solid #ffd23f; border-radius: 8px; padding: 3px 12px; }
  .gr-boxes { position: absolute; top: 8px; right: 12px; width: 250px; display: flex; flex-direction: column; gap: 6px; }
  .gr-box { pointer-events: auto; background: rgba(13, 27, 62, 0.85); border: 3px solid #fff; border-radius: 12px; padding: 0 8px;
    text-align: center; cursor: pointer; }
  .gr-box.on { border-color: #ffd23f; box-shadow: 0 0 12px #ffd23f; }
  .gr-box .arrow { background: none; border: none; font-size: 16px; line-height: 16px; padding: 2px 30px; }
  .gr-box .label { font-size: 11px; color: #90caf9; }
  .gr-box .pick { font-size: 17px; line-height: 30px; white-space: nowrap; overflow: hidden; }
  .gr-box .icon { font-size: 26px; vertical-align: middle; }
  .gr-box .swatch { display: inline-block; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #fff; vertical-align: middle; }
  .gr-box .what { font-size: 11px; color: #b9f6ca; }
  .gr-box .lock { font-size: 13px; color: #ffd23f; }
  .gr-box .lock button { font-size: 13px; background: #2e7d32; border: 2px solid #ffd23f; border-radius: 6px; padding: 1px 8px; margin-left: 4px; }
  .gr-next { position: absolute; bottom: 14px; left: 16px; font-size: 26px; background: #d8343f; border: 4px solid #ffd23f; border-radius: 12px; padding: 6px 22px; }
  .gr-help { position: absolute; bottom: 74px; left: 16px; font-size: 12px; color: #cfd8dc; }
  .gr-message { position: absolute; top: 40%; left: 0; width: 60%; text-align: center; font-size: 34px; color: #ffd23f; }
`;

export class Garage {
  constructor({ container, save, heroId, onDone, onBack }) {
    this.save = save;
    this.heroId = heroId;
    this.onDone = onDone;
    this.car = savedCar(save); // what's saved (only spoilers you own)
    this.preview = { ...this.car }; // what's on the turntable (can be a locked spoiler, to look at)
    this.selected = 0;
    this.time = 0;
    this.hop = 0;

    this.createRoom();
    this.rebuildCar();
    this.createPanel(container, onBack);
  }

  // ---------- The room ----------

  createRoom() {
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x263238);
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x546e7a, 1.4));
    const lamp = new THREE.PointLight(0xfff3e0, 60, 30);
    lamp.position.set(0, 9, 2);
    scene.add(lamp);
    const front = new THREE.DirectionalLight(0xffffff, 1.2);
    front.position.set(4, 6, 10);
    scene.add(front);
    const plain = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true });
    const block = (w, h, d, color, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plain(color));
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };

    // Floor with yellow lines, walls
    block(40, 0.2, 30, 0x78909c, 0, -0.1, 0);
    for (const x of [-6, 6]) block(0.3, 0.02, 14, 0xffd23f, x, 0.01, 0);
    block(40, 14, 0.4, 0x90a4ae, 0, 7, -8); // back wall
    block(0.4, 14, 30, 0x8a9ba5, -14, 7, 0); // left wall
    block(0.4, 14, 30, 0x8a9ba5, 14, 7, 0);

    // The garage door in the back wall, rolled half up, with the outside (sky and grass) under it
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), new THREE.MeshBasicMaterial({ color: 0x8fd3ff }));
    opening.position.set(0, 2.1, -7.75);
    scene.add(opening);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.2), new THREE.MeshBasicMaterial({ color: 0x5aa83c }));
    grass.position.set(0, 0.6, -7.74);
    scene.add(grass);
    for (const x of [-4.5, 3.5]) {
      const tree = makeTree(x > 0 ? 1 : 2);
      tree.scale.setScalar(0.35);
      tree.position.set(x, 0.5, -7.7);
      scene.add(tree);
    }
    for (let i = 0; i < 6; i++) block(14, 0.6, 0.3, i % 2 ? 0xb0bec5 : 0xcfd8dc, 0, 4.5 + i * 0.6, -7.6); // door slats
    block(14.6, 0.3, 0.5, 0x37474f, 0, 4.2, -7.55); // bottom edge of the door
    for (const x of [-7.3, 7.3]) block(0.6, 8, 0.6, 0x37474f, x, 4, -7.6); // door frame

    // Tools on the left wall, tires in the right corner
    block(0.2, 3, 6, 0x8d6e63, -13.7, 4, -3); // pegboard
    for (let i = 0; i < 4; i++) block(0.2, 1.4, 0.25, [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047][i], -13.5, 4, -5 + i * 1.3);
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.32, 8, 16), plain(0x1b1b1b));
      tire.rotation.x = Math.PI / 2;
      tire.position.set(9, 0.3 + i * 0.6, -5);
      scene.add(tire);
    }

    // The turntable
    const table = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.25, 40), plain(0x455a64));
    table.position.y = 0.12;
    scene.add(table);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.1, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.26;
    scene.add(rim);
    this.spinner = new THREE.Group();
    this.spinner.position.y = 0.25;
    scene.add(this.spinner);

    // Baby Capybara, just looking at the car (Ethan)
    this.baby = makeBabyCapybara();
    this.baby.position.set(-4.6, 0, 2.4);
    this.baby.rotation.y = Math.atan2(4.6, -2.4); // facing the car
    scene.add(this.baby);
  }

  rebuildCar() {
    if (this.model) this.spinner.remove(this.model.group);
    const driver = makeHero(this.heroId, 0, this.save.wearing?.[this.heroId] ?? null).group;
    this.model = buildCar(this.preview, this.heroId, driver);
    this.model.group.scale.setScalar(1.15);
    this.spinner.add(this.model.group);
  }

  // ---------- The boxes ----------

  createPanel(container, onBack) {
    this.root = document.createElement('div');
    this.root.className = 'gr';
    this.root.innerHTML = `
      <style>${STYLE}</style>
      <div class="gr-title">🔧 ${t('garage.title')}</div>
      <div class="gr-bolts"></div>
      <button class="gr-back">⬅ ${t('race.back')}</button>
      <div class="gr-boxes">${BOXES.map((part, i) => `
        <div class="gr-box" data-box="${i}">
          <button class="arrow up">▲</button>
          <div class="label">${t(`garage.${part}`)}</div>
          <div class="pick"></div>
          <div class="extra"></div>
          <button class="arrow down">▼</button>
        </div>`).join('')}
      </div>
      <div class="gr-help">${t('garage.help')}</div>
      <button class="gr-next">${t('garage.next')} ▶</button>
      <div class="gr-message"></div>
    `;
    container.appendChild(this.root);
    this.root.querySelector('.gr-back').addEventListener('click', onBack);
    this.root.querySelector('.gr-next').addEventListener('click', () => this.done());
    this.root.querySelectorAll('.gr-box').forEach((box) => {
      const i = Number(box.dataset.box);
      box.addEventListener('click', () => this.select(i));
      box.querySelector('.up').addEventListener('click', (event) => {
        event.stopPropagation();
        this.select(i, false);
        this.flip(-1);
      });
      box.querySelector('.down').addEventListener('click', (event) => {
        event.stopPropagation();
        this.select(i, false);
        this.flip(1);
      });
      box.querySelector('.extra').addEventListener('click', (event) => {
        if (!event.target.closest('button')) return;
        event.stopPropagation();
        this.buy();
      });
    });
    this.showBoxes();
  }

  showBoxes() {
    this.root.querySelector('.gr-bolts').textContent = `⚡ ${this.save.bolts ?? 0}`;
    this.root.querySelectorAll('.gr-box').forEach((box, i) => {
      const part = BOXES[i];
      const id = this.preview[part];
      const item = PARTS[part].find((x) => x.id === id);
      box.classList.toggle('on', i === this.selected);
      const name = t(`car.${part}.${id}`);
      const picture = part === 'color'
        ? `<span class="swatch" style="background:${item.color === null ? 'linear-gradient(135deg,#d8343f 50%,#3b8de2 50%)' : `#${item.color.toString(16).padStart(6, '0')}`}"></span>`
        : `<span class="icon">${item.icon}</span>`;
      box.querySelector('.pick').innerHTML = `${picture} ${name}`;
      let extra = '';
      if (part === 'spoiler' && id !== 'none') {
        extra = ownsSpoiler(this.save, id)
          ? `<div class="what">${t(`car.spoiler.${id}.what`)}</div>`
          : `<div class="lock">🔒 ${item.price} ⚡<button>${t('garage.buy')}</button></div>`;
      }
      box.querySelector('.extra').innerHTML = extra;
    });
  }

  select(i, sound = true) {
    if (i === this.selected) return;
    this.selected = (i + BOXES.length) % BOXES.length;
    if (sound) audio.play('click');
    this.showBoxes();
  }

  // ▲ / ▼: the previous / next choice in the selected box. The turntable car changes right away.
  flip(step) {
    const part = BOXES[this.selected];
    const list = PARTS[part];
    const i = list.findIndex((x) => x.id === this.preview[part]);
    this.preview[part] = list[(i + step + list.length) % list.length].id;
    if (part !== 'spoiler' || ownsSpoiler(this.save, this.preview.spoiler)) this.car[part] = this.preview[part];
    this.save.raceCar = { ...this.car };
    writeSave(this.save);
    audio.play('click');
    this.hop = 0.45; // Baby Capybara hops when something new goes on the car
    this.rebuildCar();
    this.showBoxes();
  }

  // Buys the locked spoiler that's showing (once, with ⚡).
  buy() {
    const id = this.preview.spoiler;
    if (ownsSpoiler(this.save, id)) return;
    const item = PARTS.spoiler.find((x) => x.id === id);
    if ((this.save.bolts ?? 0) < item.price) {
      audio.play('hurt');
      this.message(t('garage.needBolts'));
      return;
    }
    this.save.bolts -= item.price;
    this.save.raceSpoilers = [...(this.save.raceSpoilers ?? []), id];
    this.car.spoiler = id;
    this.save.raceCar = { ...this.car };
    writeSave(this.save);
    audio.play('buy');
    this.message(t('garage.bought'));
    this.hop = 0.45;
    this.showBoxes();
  }

  message(text) {
    const el = this.root.querySelector('.gr-message');
    el.textContent = text;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (el.textContent = ''), 1400);
  }

  keyDown(code) {
    if (code === 'ArrowUp' || code === 'KeyW') this.flip(-1);
    else if (code === 'ArrowDown' || code === 'KeyS') this.flip(1);
    else if (code === 'ArrowLeft' || code === 'KeyA') this.select(this.selected - 1);
    else if (code === 'ArrowRight' || code === 'KeyD') this.select(this.selected + 1);
    else if (['Enter', 'Space', 'KeyX'].includes(code)) {
      // On a locked spoiler, ENTER buys it; otherwise it's NEXT
      if (BOXES[this.selected] === 'spoiler' && !ownsSpoiler(this.save, this.preview.spoiler)) this.buy();
      else this.done();
    }
  }

  done() {
    audio.play('click');
    this.onDone({ ...this.car });
  }

  // ---------- Every frame ----------

  update(dt) {
    this.time += dt;
    this.spinner.rotation.y += SPIN * dt;
    // Baby Capybara looks: his head tilts, and he hops when the car changes
    this.hop = Math.max(0, this.hop - dt);
    this.baby.position.y = this.hop > 0 ? Math.sin((this.hop / 0.45) * Math.PI) * 0.6 : 0;
    this.baby.rotation.z = Math.sin(this.time * 1.3) * 0.12;
    const siren = this.model.group.userData.siren;
    if (siren) siren.forEach((light, i) => (light.visible = Math.floor(this.time * 4) % 2 === i));
  }

  render(renderer, width, height) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    // The car sits left of the middle, so the boxes on the right don't cover it
    this.camera.position.set(3.2, 4.2, 11.5);
    this.camera.lookAt(3.4, 1.3, 0);
    renderer.render(this.scene, this.camera);
  }

  destroy() {
    clearTimeout(this.messageTimer);
    this.root.remove();
  }
}

