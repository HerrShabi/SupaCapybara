import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { AdventureWorld } from '../adventure/AdventureWorld.js';
import { writeSave } from '../save.js';
import { Hud } from '../world2/hud.js';
import { QuestMenu } from '../quest/menu.js';
import { PLACES, STORY_START_HERO, storyProgress } from './story.js';

// THE BAD GUY KING's big map: the whole SupaCapybara world (the Adventure island's city, space launch pad
// and volcano) plus the story's new places in the south: ☁️ cloud kingdom, 🌊 underwater city, 🌴 jungle.
// Walk onto a place's glowing pad to play it: first you pick 2 heroes from your team (see story.js).
// Extends AdventureWorld for the hero (moving, jumping, camera); there are no chests or bad guys here.

const PAD_RADIUS = 2.6;
const NAME_DISTANCE = 12; // this close, the place's name shows up
export const TEAM_SIZE = 2;

export class StoryMapWorld extends AdventureWorld {
  constructor(options) {
    super({ ...options, hero: STORY_START_HERO });
  }

  get spawn() {
    // Back from a place: stand just in front of its pad. Otherwise near the middle, looking at the new places.
    const place = PLACES.find((p) => p.id === storyProgress(this.save).lastPlace);
    return place ? { x: place.x, z: place.z - 7, facing: [0, -1] } : { x: PLACES[0].x, z: 64, facing: [0, 1] };
  }

  build() {
    this.story = storyProgress(this.save);
    this.guards = []; // no bad guys on the map (AdventureWorld's Freeze Ray looks at this list)
    this.createLand();
    this.createCity();
    this.createSpace();
    this.createVolcano();
    this.createPlaces();
  }

  begin() {
    audio.playMusic('menu');
    if (this.story.lastPlace) return;
    this.hud.message(t('story.title'), t('story.mapIntro'), 4500);
  }

  createHud() {
    this.hud = new Hud(this.container, {
      title: t('story.title'),
      difficulty: t(`difficulty.${this.save.difficulty}`),
      hint: t('story.mapHint'),
      controls: t('game.controls3d'),
      menu: `${t('game.sound')}   ${t('game.menu')}`,
      maxHearts: this.settings.hearts,
      crystals: PLACES.length,
      bossName: '',
      itemIcon: '🏆',
    });
    if (this.save.touch) this.hud.hideKeyboardHints();
    this.hud.setHearts(this.player.hearts);
    this.hud.setBolts(this.save.bolts);
    this.hud.setCrystals(this.story.freed.length);
  }

  targets() {
    return [];
  }

  // ---------- The places ----------

  createPlaces() {
    this.places = PLACES.map((place) => {
      const y = this.groundAt(place.x, place.z);
      const group = new THREE.Group();
      group.position.set(place.x, y, place.z);
      this.scene.add(group);
      // The glowing pad you step on
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.3, 28),
        new THREE.MeshBasicMaterial({ color: place.ready ? 0xffd23f : 0x9e9e9e, transparent: true, opacity: 0.85 }),
      );
      pad.position.y = 0.15;
      group.add(pad);
      if (place.id === 'cloud') this.decorateCloud(group);
      if (place.id === 'underwater') this.decorateWater(group);
      if (place.id === 'jungle') this.decorateJungle(group);
      // A gold star floats over places you already won
      if (this.story.freed.includes(place.id)) {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8d6e00 }));
        star.position.y = 4;
        group.add(star);
        place.star = star;
      }
      return { ...place, y, pad, star: place.star };
    });
  }

  // Puffy clouds floating in a stack, like stairs up to the sky
  decorateCloud(group) {
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb0bec5, flatShading: true });
    [[0, 6, 3], [3, 8.5, 2], [-3, 9, 2.4], [0, 12, 3.2], [2.5, 15, 2]].forEach(([x, y, size]) => {
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(size * (0.6 + (i % 2) * 0.3), 10, 8), white);
        puff.position.set(x + (i - 1.5) * size * 0.6, y + (i % 2) * 0.5, 3 + (i % 3) * 0.6);
        group.add(puff);
      }
    });
  }

  decorateWater(group) {
    const water = new THREE.Mesh(new THREE.CircleGeometry(7, 28), new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.1, 6);
    group.add(water);
    for (let i = 0; i < 8; i++) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.3 + (i % 3) * 0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe1f5fe, transparent: true, opacity: 0.7 }));
      bubble.position.set(Math.sin(i * 2.1) * 4, 1 + i * 0.7, 6 + Math.cos(i * 2.1) * 3);
      group.add(bubble);
    }
  }

  decorateJungle(group) {
    const trunk = new THREE.MeshStandardMaterial({ color: 0x795548 });
    const leaves = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });
    [[-4, 5], [4, 6], [0, 9], [-6, 10], [6, 11]].forEach(([x, z], i) => {
      const height = 5 + (i % 3);
      const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, height, 6), trunk);
      palm.position.set(x, height / 2, z);
      group.add(palm);
      for (let j = 0; j < 5; j++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 4), leaves);
        leaf.position.set(x + Math.cos(j * 1.26) * 1.2, height, z + Math.sin(j * 1.26) * 1.2);
        leaf.rotation.set(Math.sin(j * 1.26) * 1.6, 0, -Math.cos(j * 1.26) * 1.6);
        group.add(leaf);
      }
    });
  }

  updateWorld(dt) {
    const p = this.player;
    for (const place of this.places) {
      place.pad.material.opacity = 0.6 + 0.3 * Math.sin(this.now / 250);
      if (place.star) place.star.rotation.y += dt * 2;
      const distance = Math.hypot(p.pos.x - place.x, p.pos.z - place.z);
      if (distance < NAME_DISTANCE && this.nearPlace !== place.id) {
        this.nearPlace = place.id;
        const sub = !place.ready ? t('story.comingSoon') : this.story.freed.includes(place.id) ? t('story.playAgain') : t('story.stepOnPad');
        this.hud.message(t(`story.place.${place.id}`), sub, 3000);
      }
      if (distance > NAME_DISTANCE + 4 && this.nearPlace === place.id) this.nearPlace = null;
      if (distance < PAD_RADIUS && p.onGround && place.ready && !this.leaving) this.openTeam(place);
    }
  }

  // ---------- Pick your 2 heroes ----------

  openTeam(place) {
    const saved = this.story.saved;
    if (saved.length <= 1) return this.go(place, saved); // only SuperCapybara so far: off you go
    this.teamPlace = place;
    this.picked = saved.slice(0, TEAM_SIZE);
    this.paused = true;
    audio.play('click');
    const rows = () => [
      ...saved.map((id) => ({ text: t(`name.${id}`), note: this.picked.includes(id) ? '✅' : '⬜' })),
      { text: `▶ ${t('story.go')}`, note: this.picked.length === TEAM_SIZE ? '' : t('story.pickTwo') },
    ];
    this.menu = new QuestMenu(this.container, {
      title: `🦸 ${t('story.pickTeam')}`,
      sub: () => t(`story.place.${place.id}`),
      help: t('story.teamHelp'),
      rows,
    });
  }

  updatePaused() {
    if (!this.menu) return;
    const p = this.player;
    if (this.wasPressed(p, 'up')) this.menu.move(-1);
    if (this.wasPressed(p, 'down')) this.menu.move(1);
    if (this.wasPressed(p, 'jump') || this.pressed('Enter')) {
      const saved = this.story.saved;
      const id = saved[this.menu.index];
      if (id) {
        // Pick or unpick a hero (at most 2: picking a 3rd swaps out the oldest)
        if (this.picked.includes(id)) this.picked = this.picked.filter((x) => x !== id);
        else this.picked = [...this.picked, id].slice(-TEAM_SIZE);
        audio.play('click');
      } else if (this.picked.length === TEAM_SIZE) {
        this.go(this.teamPlace, this.picked);
        return;
      } else {
        audio.play('error');
      }
      this.menu.render();
    }
    if (this.wasPressed(p, 'attack') || this.pressed('Escape')) this.closeTeam();
  }

  closeTeam() {
    this.menu?.destroy();
    this.menu = null;
    this.paused = false;
    // Step off the pad so the menu doesn't open again right away
    const place = this.teamPlace;
    const p = this.player;
    p.pos.x = place.x;
    p.pos.z = place.z - PAD_RADIUS - 1.5;
    p.pos.y = this.groundAt(p.pos.x, p.pos.z);
  }

  go(place, heroes) {
    this.leaving = true;
    this.menu?.destroy();
    this.menu = null;
    this.story.lastPlace = place.id;
    writeSave(this.save);
    audio.play('fly');
    this.hud.message(t(`story.place.${place.id}`), t('story.letsGo'), 0);
    setTimeout(() => this.exit(place.scene, { heroes }), 900);
  }

  // next: a place's scene to start with `data`, or nothing to go back to the title screen
  exit(next, data) {
    if (this.ended) return;
    this.destroy();
    this.onExit(next, data);
  }
}
