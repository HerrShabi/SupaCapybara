import * as THREE from 'three';
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { getDifficulty } from '../difficulty.js';
import { writeSave } from '../save.js';
import { unlockTrophy } from '../trophies.js';
import { makeHero } from '../world2/models.js';
import { makeTree } from '../adventure/models.js';
import { buildTrack, TRACK_WIDTH } from './track.js';
import { makeCar, makeRobotCopy, makeStartLight, makePodium, makeTexture, ROBOT_COLOR } from './models.js';
import { buildCar, savedCar, WHEELS } from './cars.js';
import { Garage } from './Garage.js';
import { RaceHud } from './hud.js';

// CAPY CIRCUIT 🦫🏁 (Ethan, 2026-11-21/22; GAME_DESIGN.md "Race mode"): you against 3 robot cars driven by the
// story's evil robot copies, on a 3D track with a hill bridge, a river jump, a loop-the-loop and boost pads.
// Like World 2 and ADVENTURE, it's Three.js with its own loop, keys and HTML HUD; RaceScene wraps it.
//
// The race goes: 'garage' (build your car: Garage.js; RACE AGAIN skips it) → 'laps' (pick 1, 3 or 5 laps) → 'countdown' (Baby Capybara's traffic light) → 'race' →
// 'finish' (you crossed the line; the others drive on for a moment) → 'podium' (top 3, confetti, your win dance).
// Cars live in track space (track.js): dist = how far they've driven (lap * track length + s), lat = right of
// the middle, h = height above the road (jumps), yaw = which way they point compared to the road (+ = left).

export const LAP_CHOICES = [1, 3, 5];
const TOP_SPEED = 34;
const ACCEL = 16;
const BRAKE = 30;
const REVERSE_SPEED = 8;
const BOOST = 1.5; // times top speed on a boost pad
const BOOST_MS = 1400;
const STEER = 1.9; // how fast the car turns (radians a second)
const MAX_YAW = 1.0;
const GRAVITY = 28;
const CAR_HALF_WIDTH = 1.2;
const WALL = TRACK_WIDTH / 2 - CAR_HALF_WIDTH;
const ROBOTS = [
  { hero: 'supa-cat', name: 'story.darkCat', lane: -4, skill: 1 },
  { hero: 'supa-chameleon', name: 'story.darkChameleon', lane: 0, skill: 0.97 },
  { hero: 'ultra-capybara', name: 'story.darkUltra', lane: 4, skill: 0.94 },
];
const PRIZE_PER_LAP = [40, 25, 15, 5]; // ⚡ for 1st, 2nd, 3rd, 4th, times the laps
// Spoilers (cars.js): rocket = C for a quick boost; wing = longer jumps; shield = bumps bounce off you
const ROCKET_MS = 1500;
const ROCKET_WAIT = 7; // seconds
const WING_LIFT = 1.3; // jump speed times this
const WING_GRAVITY = 0.7;
const FINISH_WAIT = 3; // seconds after you cross the line before the podium

const KEYS = {
  gas: ['ArrowUp', 'KeyW', 'Space'],
  brake: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

const smoothing = (rate, dt) => 1 - Math.exp(-rate * dt);

export class RaceWorld {
  constructor({ container, save, onExit, onCarReady = () => {}, autoGas = false, skipGarage = false }) {
    this.onCarReady = onCarReady;
    this.container = container;
    this.save = save;
    this.onExit = onExit;
    this.autoGas = autoGas; // touch screens: the car goes by itself, you only steer (and brake)
    this.settings = getDifficulty(save.difficulty);
    this.heroId = save.selected ?? 'supa-capybara';
    this.laps = 3;
    this.state = skipGarage ? 'laps' : 'garage';
    this.carConfig = savedCar(save);
    this.time = 0; // seconds since the race started
    this.clock = 0; // seconds since the world opened
    this.down = new Set();
    this.finishers = [];
    this.effects = [];

    this.track = buildTrack();
    this.createRenderer();
    this.createWorld();
    this.createCars();
    this.hud = new RaceHud(container, this.track, {
      onLaps: (laps) => this.pickLaps(laps),
      onStart: () => this.startCountdown(),
      onAgain: () => this.exit(true),
      onBack: () => this.exit(false),
    });
    if (this.state === 'garage') {
      this.hud.root.style.display = 'none';
      this.garage = new Garage({
        container,
        save,
        heroId: this.heroId,
        onBack: () => this.exit(false),
        onDone: (config) => this.leaveGarage(config),
      });
    } else {
      this.hud.showLapMenu(this.laps);
      onCarReady(this.carConfig);
    }

    this.onKeyDown = (event) => this.keyDown(event);
    this.onKeyUp = (event) => this.down.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    audio.playMusic('menu');

    this.last = performance.now();
    this.frame = requestAnimationFrame((time) => this.loop(time));
  }

  // ---------- Setup ----------

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd3ff);
    this.scene.fog = new THREE.Fog(0x8fd3ff, 120, 420);
    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 1000);
    this.resize = () => {
      const { clientWidth: width, clientHeight: height } = this.container;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / Math.max(1, height);
      this.camera.updateProjectionMatrix();
    };
    this.resize();
    window.addEventListener('resize', this.resize);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4a7a3a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(80, 150, 40);
    this.scene.add(sun);
  }

  createWorld() {
    const track = this.track;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 0x5aa83c }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(100, -0.08, 0);
    this.scene.add(ground);

    // The road, the red and white curbs, and the low walls (not over the river)
    const half = TRACK_WIDTH / 2;
    this.scene.add(this.ribbon(-half, half, 0, 0, (i) => (Math.floor(i / 4) % 2 ? 0x55555c : 0x606068)));
    for (const side of [-1, 1]) {
      this.scene.add(this.ribbon(side * half, side * (half + 1.2), 0.05, 0.05, (i) => (Math.floor(i / 2) % 2 ? 0xe53935 : 0xffffff)));
      this.scene.add(this.ribbon(side * (half + 1.2), side * (half + 1.2), 0, 1.2, (i) => (Math.floor(i / 3) % 2 ? 0x1565c0 : 0xffffff)));
    }

    // Pillars under the hill bridge
    track.samples.forEach((sample, i) => {
      if (i % 8 || sample.loop || sample.pos.y < 1.2) return;
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, sample.pos.y), new THREE.MeshStandardMaterial({ color: 0x9e9e9e }));
        pillar.position.copy(sample.pos).addScaledVector(sample.right, side * (half - 1));
        pillar.position.y = sample.pos.y / 2 - 0.1;
        this.scene.add(pillar);
      }
    });

    // The river under the jump
    for (const jump of track.jumps) {
      const middle = track.at((jump.lip + jump.gapEnd) / 2);
      const river = new THREE.Mesh(new THREE.PlaneGeometry(90, jump.gapEnd - jump.lip), new THREE.MeshStandardMaterial({ color: 0x29b6f6, emissive: 0x0d47a1, emissiveIntensity: 0.3 }));
      this.lay(river, middle, 0, -0.02);
      this.scene.add(river);
    }

    // Start / finish line, with a banner over it
    const line = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, 2.5), new THREE.MeshBasicMaterial({ map: makeTexture('checker') }));
    line.material.map.wrapS = THREE.RepeatWrapping;
    line.material.map.repeat.set(4, 0.5);
    this.lay(line, track.at(0), 0, 0.03);
    this.scene.add(line);
    this.scene.add(this.makeGantry(track.at(0)));

    // Boost pads
    const chevrons = new THREE.MeshBasicMaterial({ map: makeTexture('boost') });
    for (const pad of track.boosts) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 6), chevrons);
      this.lay(mesh, track.at(pad.s), pad.lat, 0.04);
      this.scene.add(mesh);
    }

    // Baby Capybara with the traffic light, floating over the start
    this.startLight = makeStartLight();
    const lightSpot = track.place(24, 0, 5);
    this.startLight.group.position.copy(lightSpot.point);
    this.startLight.group.rotation.y = Math.atan2(-lightSpot.forward.x, -lightSpot.forward.z); // facing the cars
    this.scene.add(this.startLight.group);

    // A grandstand full of fans next to the start, and the podium a bit further on
    this.scene.add(this.makeGrandstand(track.at(35)));
    const podiumSpot = track.place(95, half + 16);
    this.podium = makePodium();
    this.podium.group.position.copy(podiumSpot.point);
    this.podium.group.rotation.y = Math.atan2(-podiumSpot.right.x, -podiumSpot.right.z); // facing the track
    this.scene.add(this.podium.group);

    // Trees, not on the track
    const near = (x, z) => track.samples.some((sample, i) => i % 4 === 0 && Math.hypot(sample.pos.x - x, sample.pos.z - z) < 16);
    let placed = 0;
    for (let i = 0; placed < 90 && i < 600; i++) {
      const x = -150 + ((i * 97) % 500);
      const z = -260 + ((i * 61) % 520);
      if (near(x, z) || Math.hypot(x - this.podium.group.position.x, z - this.podium.group.position.z) < 20) continue;
      const tree = makeTree(i);
      tree.position.set(x, 0, z);
      this.scene.add(tree);
      placed++;
    }
  }

  // A strip along the track from lat a to lat b, at heights ha / hb above the road. color(i) for each piece.
  ribbon(a, b, ha, hb, color) {
    const positions = [];
    const colors = [];
    const c = new THREE.Color();
    const { samples, length } = this.track;
    const corner = (sample, lat, h) => sample.pos.clone().addScaledVector(sample.right, lat).addScaledVector(sample.up, h);
    for (let i = 0; i < length; i++) {
      const s0 = samples[i];
      const s1 = samples[(i + 1) % length];
      if (s0.gap) continue;
      const quad = [corner(s0, a, ha), corner(s0, b, hb), corner(s1, a, ha), corner(s0, b, hb), corner(s1, b, hb), corner(s1, a, ha)];
      c.setHex(color(i));
      for (const point of quad) {
        positions.push(point.x, point.y, point.z);
        colors.push(c.r, c.g, c.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
  }

  // Lays a flat plane on the road at a track frame (lat to the right, lifted a little).
  lay(mesh, frame, lat, lift) {
    mesh.position.copy(frame.pos).addScaledVector(frame.right, lat).addScaledVector(frame.up, lift);
    const m = new THREE.Matrix4().makeBasis(frame.right, frame.forward, frame.up); // plane's +Y points along the road
    mesh.quaternion.setFromRotationMatrix(m);
  }

  makeGantry(frame) {
    const group = new THREE.Group();
    const half = TRACK_WIDTH / 2 + 2;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), new THREE.MeshStandardMaterial({ color: 0x37474f }));
      post.position.copy(frame.pos).addScaledVector(frame.right, side * half).setY(4.5);
      group.add(post);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d8343f';
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 60px Arial Black, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CAPY CIRCUIT', 256, 52);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1, 3, 0.5), [
      ...Array(4).fill(new THREE.MeshStandardMaterial({ color: 0xd8343f })),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }),
    ]);
    banner.position.copy(frame.pos).setY(9);
    banner.rotation.y = Math.atan2(frame.forward.x, frame.forward.z);
    group.add(banner);
    return group;
  }

  makeGrandstand(frame) {
    const group = new THREE.Group();
    const fans = [0xff5252, 0xffd23f, 0x40c4ff, 0x69f0ae, 0xe040fb, 0xffffff];
    for (let row = 0; row < 4; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x90a4ae }));
      step.position.set(0, 0.6 + row * 1.2, row * 2.4);
      step.scale.y = 1 + row * 2;
      step.position.y = (1.2 * (1 + row * 2)) / 2;
      group.add(step);
      for (let i = 0; i < 18; i++) {
        const fan = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: fans[(i * 7 + row * 3) % fans.length] }));
        fan.position.set(-19 + i * 2.2 + (row % 2), 1.2 * (1 + row * 2) + 0.6, row * 2.4);
        fan.userData.fan = i + row;
        group.add(fan);
      }
    }
    this.fans = group.children.filter((child) => child.userData.fan !== undefined);
    // Outside the right side of the road, facing it
    group.position.copy(frame.pos).addScaledVector(frame.right, TRACK_WIDTH / 2 + 6);
    group.rotation.y = Math.atan2(-frame.right.x, -frame.right.z) + Math.PI;
    return group;
  }

  // Your car, built from the garage's parts
  makePlayerCar() {
    const hat = this.save.wearing?.[this.heroId] ?? null;
    const radius = WHEELS.find((w) => w.id === this.carConfig.wheels)?.radius ?? 0.48;
    return this.makeCarState(buildCar(this.carConfig, this.heroId, makeHero(this.heroId, 0, hat).group), {
      isPlayer: true,
      name: t('race.you'),
      spoiler: this.carConfig.spoiler,
      wheelRadius: radius,
    });
  }

  // Out of the garage: swap in the car you built, then pick the laps
  leaveGarage(config) {
    this.carConfig = config;
    const old = this.player;
    old.group.removeFromParent();
    const car = this.makePlayerCar();
    for (const key of ['dist', 'lat', 'lane']) car[key] = old[key];
    this.player = car;
    this.cars[this.cars.indexOf(old)] = car;
    this.placeCar(car);
    this.garage.destroy();
    this.garage = null;
    this.hud.root.style.display = '';
    this.state = 'laps';
    this.hud.showLapMenu(this.laps);
    this.onCarReady(config);
  }

  createCars() {
    const player = this.makePlayerCar();
    const robots = ROBOTS.map((robot) => this.makeCarState(makeCar(ROBOT_COLOR, 0xff1744, makeRobotCopy(robot.hero)), { ...robot, name: t(robot.name) }));
    this.player = player;
    this.cars = [player, ...robots];
    // The grid behind the line: 2 by 2, you at the back right
    const grid = [[-6, -3], [-6, 3], [-14, -3], [-14, 3]];
    [robots[0], robots[1], robots[2], player].forEach((car, i) => {
      car.dist = grid[i][0];
      car.lat = grid[i][1];
      car.lane = car.isPlayer ? 0 : car.lane;
    });
    this.cars.forEach((car) => this.placeCar(car));
  }

  makeCarState({ group, wheels, bubble }, extra) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 8), new THREE.MeshBasicMaterial({ color: 0xff9100 }));
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, 0.6, -2.4);
    flame.visible = false;
    group.add(flame);
    this.scene.add(group);
    return { group, wheels, bubble, flame, wheelRadius: 0.48, spoiler: 'none', rocketReady: 0, shieldUntil: 0, dist: 0, lat: 0, h: 0, vy: 0, yaw: 0, v: 0, boostUntil: 0, lane: 0, skill: 1, finished: false, ...extra };
  }

  // ---------- Menu, countdown ----------

  keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    this.down.add(event.code);
    if (event.code === 'Escape') return this.exit(false);
    if (this.state === 'garage') {
      this.garage.keyDown(event.code);
    } else if (this.state === 'laps') {
      const i = LAP_CHOICES.indexOf(this.laps);
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.pickLaps(LAP_CHOICES[Math.max(0, i - 1)]);
      if (event.code === 'ArrowRight' || event.code === 'KeyD') this.pickLaps(LAP_CHOICES[Math.min(LAP_CHOICES.length - 1, i + 1)]);
      if (['Enter', 'Space', 'KeyX'].includes(event.code)) this.startCountdown();
    } else if (this.state === 'podium' && this.podiumReady) {
      if (['Enter', 'Space', 'KeyX', 'KeyR'].includes(event.code)) this.exit(true);
    } else if (event.code === 'KeyX' && this.state !== 'podium') {
      this.honk();
    } else if (event.code === 'KeyC' && this.state === 'race') {
      this.fireRocket(this.player);
    }
  }

  pickLaps(laps) {
    if (this.state !== 'laps') return;
    audio.play('click');
    this.laps = laps;
    this.hud.showLapMenu(laps);
  }

  startCountdown() {
    if (this.state !== 'laps') return;
    audio.play('click');
    this.hud.hidePanel();
    this.hud.showMap();
    this.state = 'countdown';
    this.countdown = 0;
    this.lightsOn = 0;
    audio.stopMusic();
  }

  updateCountdown(dt) {
    this.countdown += dt;
    // red (after 0.6 s), red, red... GREEN! GO!
    const lights = Math.min(3, Math.floor((this.countdown - 0.6) / 0.9) + 1);
    if (lights > this.lightsOn && this.countdown >= 0.6) {
      this.lightsOn = lights;
      this.startLight.setLights(lights);
      audio.play('countdown');
      this.hud.message(['🔴', '🔴🔴', '🔴🔴🔴'][lights - 1]);
    }
    if (this.countdown >= 0.6 + 0.9 * 3) {
      this.state = 'race';
      this.startLight.setLights(3, true);
      audio.tone({ from: 1320, length: 0.45, volume: 0.14 });
      this.hud.message(t('race.go'), 900);
      audio.playMusic('race');
      // The robots don't all react at the same moment
      this.cars.forEach((car, i) => (car.startDelay = car.isPlayer ? 0 : 0.1 + i * 0.12));
    }
  }

  // The rocket spoiler: C = a quick boost, then it needs a few seconds to get ready again
  fireRocket(car) {
    if (car.spoiler !== 'rocket' || car.finished || this.clock < car.rocketReady) return;
    car.rocketReady = this.clock + ROCKET_WAIT;
    car.boostUntil = this.clock * 1000 + ROCKET_MS;
    audio.play('blastOff');
    this.hud.message('🚀', 700);
  }

  honk() {
    audio.tone({ wave: 'square', from: 440, length: 0.12, volume: 0.1 });
    audio.tone({ wave: 'square', from: 440, length: 0.12, volume: 0.1, delay: 0.18 });
  }

  // ---------- Driving ----------

  updateCar(car, dt) {
    const L = this.track.length;
    if (car.startDelay > 0) {
      car.startDelay -= dt;
      return;
    }
    const now = this.clock * 1000;
    const boosted = now < car.boostUntil;
    const done = car.finished;
    let top = TOP_SPEED;
    let gas;
    let brake = false;
    let steer = 0; // + = left
    let follow = 0; // how much the car follows the curve by itself

    if (car.isPlayer && !done) {
      gas = this.autoGas || this.isDown('gas');
      brake = this.isDown('brake');
      steer = (this.isDown('left') ? 1 : 0) - (this.isDown('right') ? 1 : 0);
      follow = this.settings.raceSteerHelp;
    } else {
      // Robot driving (and yours after the finish): follow a lane, grab boost pads, go around cars ahead
      top *= car.isPlayer ? 0.55 : this.settings.raceRobotSpeed * car.skill * (done ? 0.6 : 1);
      if (!car.isPlayer && !done) {
        const lead = this.player.dist - car.dist; // a little catch-up, so it stays a race
        if (lead > 90) top *= 1.06;
        if (lead < -90) top *= 0.93;
      }
      gas = true;
      follow = 1;
      let target = car.lane;
      const s = this.track.wrap(car.dist);
      const pad = this.track.boosts.find((p) => {
        const ahead = this.track.wrap(p.s - s);
        return ahead > 0 && ahead < 60;
      });
      if (pad) target = pad.lat;
      for (const other of this.cars) {
        if (other === car) continue;
        const ahead = other.dist - car.dist;
        if (ahead > 0 && ahead < 9 && Math.abs(other.lat - car.lat) < 2.6) target = other.lat > 0 ? other.lat - 4 : other.lat + 4;
      }
      const wanted = THREE.MathUtils.clamp(-(target - car.lat) * 0.08, -0.35, 0.35);
      car.yaw += THREE.MathUtils.clamp(wanted - car.yaw, -2.5 * dt, 2.5 * dt);
    }
    if (boosted) top *= BOOST;

    const onGround = car.h <= 0;
    if (onGround) {
      if (brake) car.v = Math.max(-REVERSE_SPEED, car.v - BRAKE * dt);
      else if (gas) car.v = car.v < top ? Math.min(top, car.v + ACCEL * dt * (boosted ? 3 : 1)) : Math.max(top, car.v - 20 * dt);
      else car.v *= 1 - 0.8 * dt;
      const grip = THREE.MathUtils.clamp(Math.abs(car.v) / 12, 0.3, 1);
      car.yaw += steer * STEER * grip * dt * Math.sign(car.v || 1);
      if (car.isPlayer && !done && !steer) car.yaw *= 1 - 1.2 * dt; // let go: the wheels straighten a little
    }

    const before = this.track.wrap(car.dist);
    const ds = car.v * Math.cos(car.yaw) * dt;
    const kappa = this.track.sample(car.dist).kappa;
    if (onGround) car.yaw -= kappa * ds * (1 - follow); // the road turns under you
    car.yaw = THREE.MathUtils.clamp(car.yaw, -MAX_YAW, MAX_YAW);
    car.dist += ds;
    car.lat -= car.v * Math.sin(car.yaw) * dt;

    // Walls: bounce back toward the middle and slow down
    if (Math.abs(car.lat) > WALL) {
      const side = Math.sign(car.lat);
      car.lat = side * WALL;
      const outward = -Math.sin(car.yaw) * car.v * side; // how fast you were going into the wall
      if (outward > 6) {
        // A real crash: bounce off and lose some speed
        car.yaw = -car.yaw * 0.4;
        car.v *= 0.8;
        if (car.isPlayer && this.clock - (this.lastWallSound ?? 0) > 0.3) {
          this.lastWallSound = this.clock;
          audio.play('bounce');
        }
      } else if (outward > 0) {
        // Scraping along it: straighten out, a little slower
        car.yaw *= 0.5;
        car.v *= 1 - 0.6 * dt;
      }
    }

    // Jumps: driving off the ramp's lip sends you flying over the river
    const after = this.track.wrap(car.dist);
    if (onGround) {
      for (const jump of this.track.jumps) {
        if (before < jump.lip && after >= jump.lip && after - before < 10) {
          car.h = jump.height;
          car.vy = (car.v * jump.slope + 2) * (car.spoiler === 'wing' ? WING_LIFT : 1);
          if (car.isPlayer) audio.play('jump');
        }
      }
    } else {
      car.vy -= GRAVITY * (car.spoiler === 'wing' ? WING_GRAVITY : 1) * dt;
      car.h += car.vy * dt;
      if (car.h <= 0) {
        car.h = 0;
        car.vy = 0;
        const sample = this.track.sample(car.dist);
        if (sample.gap) this.splash(car);
        else if (car.isPlayer) audio.play('stomp');
      }
    }

    // Boost pads
    if (car.h <= 0) {
      for (const pad of this.track.boosts) {
        if (Math.abs(this.track.wrap(after - pad.s + L / 2) - L / 2) < 3 && Math.abs(car.lat - pad.lat) < 2.4) {
          if (!boosted && car.isPlayer) {
            audio.play('rocket');
            this.hud.message(t('race.boost'), 700);
          }
          car.boostUntil = now + BOOST_MS;
        }
      }
    }

    // Crossing the line
    if (!car.finished && car.dist >= this.laps * L) {
      car.finished = true;
      this.finishers.push(car);
      if (car.isPlayer) this.playerFinished();
    } else if (car.isPlayer && Math.floor(car.dist / L) > Math.floor((car.dist - ds) / L) && car.dist > 0 && !car.finished) {
      const lap = Math.floor(car.dist / L) + 1;
      this.hud.message(lap === this.laps ? t('race.lastLap') : t('race.lap', { lap, laps: this.laps }), 1200);
      audio.play('key');
    }
  }

  // Fell in the river: SPLASH! Back on the road right after it, slow.
  splash(car) {
    const jump = this.track.jumps.find((j) => {
      const s = this.track.wrap(car.dist);
      return s >= j.lip - 1 && s < j.gapEnd;
    });
    if (jump) car.dist += jump.gapEnd + 2 - this.track.wrap(car.dist);
    car.lat = 0;
    car.yaw = 0;
    car.v = 8;
    if (car.isPlayer) {
      audio.play('fall');
      this.hud.message(t('race.splash'), 1200);
    }
  }

  // Cars bump each other: pushed apart sideways, and the one behind slows down
  bumpCars() {
    const L = this.track.length;
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const a = this.cars[i];
        const b = this.cars[j];
        if (a.h > 0.5 || b.h > 0.5) continue;
        const along = this.track.wrap(b.dist - a.dist + L / 2) - L / 2;
        const side = b.lat - a.lat;
        if (Math.abs(along) > 4.2 || Math.abs(side) > 2.3) continue;
        const push = (2.3 - Math.abs(side)) / 2;
        const dir = side === 0 ? 1 : Math.sign(side);
        // The shield spoiler: the bump bounces off you, and the other car gets pushed away hard
        const shieldA = a.spoiler === 'shield';
        const shieldB = b.spoiler === 'shield';
        if (shieldA !== shieldB) {
          const [shielded, other, away] = shieldA ? [a, b, dir] : [b, a, -dir];
          other.lat += away * (push * 2 + 1.5);
          other.v *= 0.85;
          shielded.shieldUntil = this.clock + 0.5;
          if (shielded.isPlayer && this.clock - (this.lastBump ?? 0) > 0.4) {
            this.lastBump = this.clock;
            audio.play('shield');
          }
          continue;
        }
        a.lat -= dir * push;
        b.lat += dir * push;
        if (Math.abs(along) > Math.abs(side) * 1.2) {
          const [back, front] = along > 0 ? [a, b] : [b, a];
          if (back.v > front.v) {
            front.v += 2;
            back.v = front.v * 0.9;
          }
        }
        if ((a.isPlayer || b.isPlayer) && this.clock - (this.lastBump ?? 0) > 0.4) {
          this.lastBump = this.clock;
          audio.play('stomp');
        }
      }
    }
  }

  placeCar(car) {
    const frame = this.track.place(car.dist, car.lat, car.h);
    const forward = frame.forward.clone().multiplyScalar(Math.cos(car.yaw)).addScaledVector(frame.right, -Math.sin(car.yaw));
    const left = frame.up.clone().cross(forward).normalize();
    car.group.position.copy(frame.point);
    car.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(left, frame.up, forward));
    car.frame = frame;
    car.forward = forward;
    for (const wheel of car.wheels) wheel.rotation.x += (car.v * 0.016) / car.wheelRadius;
    if (car.bubble) car.bubble.visible = this.clock < car.shieldUntil;
    const siren = car.group.userData.siren;
    if (siren) siren.forEach((light, i) => (light.visible = Math.floor(this.clock * 4) % 2 === i));
    car.flame.visible = this.clock * 1000 < car.boostUntil;
    car.flame.scale.y = 0.8 + Math.random() * 0.5;
  }

  isDown(action) {
    return KEYS[action].some((code) => this.down.has(code));
  }

  // Who's 1st, 2nd...: the cars that finished (in order), then everybody else by how far they've driven.
  standings() {
    const rest = this.cars.filter((car) => !car.finished).sort((a, b) => b.dist - a.dist);
    return [...this.finishers, ...rest];
  }

  // ---------- The end ----------

  playerFinished() {
    this.state = 'finish';
    this.finishTimer = FINISH_WAIT;
    const place = this.standings().indexOf(this.player);
    this.hud.message(t('race.finish'), 2500, t(`race.place${place + 1}`));
    audio.play(place === 0 ? 'win' : 'key');
  }

  showPodium() {
    this.state = 'podium';
    const order = this.standings();
    const place = order.indexOf(this.player);
    for (const car of this.cars) car.group.visible = false;

    // Prize: bolts for your place, and the race trophies
    const prize = PRIZE_PER_LAP[place] * this.laps;
    this.save.bolts = (this.save.bolts ?? 0) + prize;
    if (place === 0) {
      unlockTrophy(this.save, 'raceWin');
      if (this.laps === 5) unlockTrophy(this.save, 'race5');
      if (this.save.difficulty === 'extreme') unlockTrophy(this.save, 'raceExtreme');
    }
    writeSave(this.save);

    // The top 3 stand on the podium; you dance if you're there
    this.podiumHeroes = order.slice(0, 3).map((car, i) => {
      const model = car.isPlayer ? makeHero(this.heroId, 0, this.save.wearing?.[this.heroId] ?? null).group : makeRobotCopy(car.hero);
      model.scale.setScalar(1.6);
      model.position.copy(this.podium.tops[i]);
      this.podium.group.add(model);
      return { model, dancing: car.isPlayer, base: this.podium.tops[i].clone() };
    });
    this.createConfetti();
    audio.playMusic('menu');
    if (place < 3) audio.play('win');
    this.podiumTime = 0;
    this.hud.showResults(t(`race.place${place + 1}`), prize, place === 0);
    // Wait a moment, so a key still held from driving doesn't skip the podium
    setTimeout(() => (this.podiumReady = true), 1200);
  }

  createConfetti() {
    const colors = [0xff5252, 0xffd23f, 0x40c4ff, 0x69f0ae, 0xe040fb].map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    const shape = new THREE.PlaneGeometry(0.25, 0.4);
    this.confetti = Array.from({ length: 140 }, (_, i) => {
      const piece = new THREE.Mesh(shape, colors[i % colors.length]);
      piece.position.set((Math.random() - 0.5) * 14, Math.random() * 14, (Math.random() - 0.5) * 6);
      piece.userData.spin = Math.random() * 6;
      this.podium.group.add(piece);
      return piece;
    });
    this.nextFirework = 0;
  }

  updatePodium(dt) {
    this.podiumTime += dt;
    const time = this.podiumTime;
    for (const [i, hero] of this.podiumHeroes.entries()) {
      if (hero.dancing) {
        // The win dance: hop, spin, hop
        hero.model.position.y = hero.base.y + Math.abs(Math.sin(time * 5)) * 1.2;
        hero.model.rotation.y = Math.floor(time / 0.8) % 2 ? time * 9 : Math.sin(time * 6) * 0.5;
      } else {
        hero.model.position.y = hero.base.y + Math.abs(Math.sin(time * 3 + i)) * 0.3;
      }
    }
    for (const piece of this.confetti) {
      piece.position.y -= dt * 2.5;
      piece.position.x += Math.sin(time * 2 + piece.userData.spin) * dt;
      piece.rotation.x += dt * piece.userData.spin;
      piece.rotation.y += dt * 2;
      if (piece.position.y < 0) piece.position.y = 14;
    }
    // Fireworks over the podium
    this.nextFirework -= dt;
    if (this.nextFirework <= 0) {
      this.nextFirework = 0.6;
      this.firework(new THREE.Vector3((Math.random() - 0.5) * 16, 10 + Math.random() * 5, -3 - Math.random() * 4));
    }
    this.updateEffects(dt);

    // The camera in front of the podium
    const center = this.podium.group.localToWorld(new THREE.Vector3(0, 3.6, 0));
    const eye = this.podium.group.localToWorld(new THREE.Vector3(Math.sin(time * 0.3) * 2.5, 5, 11.5));
    this.camera.up.set(0, 1, 0);
    this.camera.position.copy(eye);
    this.camera.lookAt(center);
  }

  firework(at) {
    audio.play('pop');
    const color = [0xff5252, 0xffd23f, 0x40c4ff, 0x69f0ae, 0xe040fb][Math.floor(Math.random() * 5)];
    const material = new THREE.MeshBasicMaterial({ color, transparent: true });
    const geometry = new THREE.SphereGeometry(0.18, 6, 4);
    for (let i = 0; i < 24; i++) {
      const spark = new THREE.Mesh(geometry, material);
      spark.position.copy(at);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(5 + Math.random() * 2);
      this.podium.group.add(spark);
      this.effects.push({ mesh: spark, velocity: dir, life: 1.2, material });
    }
  }

  updateEffects(dt) {
    this.effects = this.effects.filter((effect) => {
      effect.life -= dt;
      effect.velocity.y -= 4 * dt;
      effect.mesh.position.addScaledVector(effect.velocity, dt);
      effect.material.opacity = Math.max(0, effect.life / 1.2);
      if (effect.life > 0) return true;
      effect.mesh.removeFromParent();
      return false;
    });
  }

  // ---------- Camera, loop ----------

  updateCamera(dt, snap = false) {
    const car = this.player;
    const frame = car.frame;
    const forward = car.forward;
    const tight = frame.loop ? 12 : 6;
    const wantPos = car.group.position.clone().addScaledVector(forward, -8).addScaledVector(frame.up, 3.4);
    const wantLook = car.group.position.clone().addScaledVector(forward, 5).addScaledVector(frame.up, 1.2);
    if (snap || !this.cameraLook) {
      this.camera.position.copy(wantPos);
      this.cameraLook = wantLook;
      this.camera.up.copy(frame.up);
    } else {
      this.camera.position.lerp(wantPos, smoothing(tight, dt));
      this.cameraLook.lerp(wantLook, smoothing(tight * 1.5, dt));
      this.camera.up.lerp(frame.up, smoothing(tight, dt)).normalize();
    }
    this.camera.lookAt(this.cameraLook);
  }

  loop(time) {
    const dt = Math.min(0.05, (time - this.last) / 1000);
    this.last = time;
    this.clock += dt;

    if (this.state === 'garage') {
      this.garage.update(dt);
      const { clientWidth, clientHeight } = this.container;
      this.garage.render(this.renderer, clientWidth, clientHeight);
      this.frame = requestAnimationFrame((next) => this.loop(next));
      return;
    }
    if (this.state === 'laps') {
      // Fly around the grid while you pick the laps
      const center = this.track.place(-10, 0).point;
      const angle = this.clock * 0.25;
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(center.x + Math.sin(angle) * 22, 9, center.z + Math.cos(angle) * 22);
      this.camera.lookAt(center);
    } else if (this.state === 'countdown') {
      this.updateCountdown(dt);
      this.updateCamera(dt, true);
    } else if (this.state === 'race' || this.state === 'finish') {
      this.time += this.state === 'race' ? dt : 0;
      for (const car of this.cars) this.updateCar(car, dt);
      this.bumpCars();
      for (const car of this.cars) this.placeCar(car);
      this.updateCamera(dt);
      if (this.state === 'finish') {
        this.finishTimer -= dt;
        if (this.finishTimer <= 0) this.showPodium();
      }
    } else if (this.state === 'podium') {
      this.updatePodium(dt);
    }

    // Baby Capybara bobs on her cloud, and the fans cheer
    this.startLight.group.position.y += Math.sin(this.clock * 2) * 0.01;
    for (const fan of this.fans) fan.position.y += Math.sin(this.clock * 8 + fan.userData.fan) * 0.02;

    if (this.state !== 'podium' && this.state !== 'laps') {
      const order = this.standings();
      const lap = Math.min(this.laps, Math.max(1, Math.floor(this.player.dist / this.track.length) + 1));
      this.hud.update({ lap, laps: this.laps, time: this.time, place: order.indexOf(this.player), order, player: this.player, cars: this.cars });
      if (this.player.spoiler === 'rocket') this.hud.setRocket(this.clock >= this.player.rocketReady);
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame((next) => this.loop(next));
  }

  exit(again) {
    if (this.leaving) return;
    this.leaving = true;
    audio.play('click');
    this.destroy();
    this.onExit(again);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    this.hud.destroy();
    this.garage?.destroy();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
