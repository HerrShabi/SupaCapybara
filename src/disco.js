import { t } from './i18n.js';
import { audio } from './audio.js';

// THE SECRET CAPYBARA DISCO (Ethan's easter egg, 2026-11-08): the same well-hidden surprise in every STORY
// world. Attack the little crack (each world hides it somewhere else) and it breaks open: disco music, flashing
// lights, a disco ball, and dancing capybaras. Your hero joins the party and dances, then the capybaras wave
// goodbye, hand you a MAGIC STRAWBERRY (strawberry.js; golden the first time in each world), and you keep playing.
//
// It's an HTML overlay, so the 2D worlds (SideScrollerScene) and World 2's 3D (SpaceWorld) show the same party.
// showDisco({ hero, capybara, music, reward, onDone }): hero / capybara are image URLs (see heroPicture);
// music is the song to go back to afterwards; reward is 'gold', 'red' or 'full' (from discoReward).

const PARTY_MS = 6500; // dancing
const BYE_MS = 3200; // waving goodbye and handing you the strawberry, then the party fades away

const STYLE = `
.disco { position: fixed; inset: 0; z-index: 40; overflow: hidden; background: radial-gradient(circle at 50% 30%, #4a148c, #12002b 70%);
  font-family: 'Arial Black', Arial, sans-serif; transition: opacity 0.5s; opacity: 0; }
.disco.show { opacity: 1; }
.disco .beams { position: absolute; left: 50%; top: 12%; width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax; opacity: 0.35;
  background: conic-gradient(#ff1744 0 8deg, transparent 8deg 45deg, #00e5ff 45deg 53deg, transparent 53deg 90deg, #ffea00 90deg 98deg,
  transparent 98deg 135deg, #76ff03 135deg 143deg, transparent 143deg 180deg, #ff1744 180deg 188deg, transparent 188deg 225deg,
  #00e5ff 225deg 233deg, transparent 233deg 270deg, #ffea00 270deg 278deg, transparent 278deg 315deg, #d500f9 315deg 323deg, transparent 323deg);
  animation: disco-spin 6s linear infinite; }
.disco .ball { position: absolute; left: 50%; top: 4%; font-size: 13vmin; transform-origin: 50% -40%; animation: disco-swing 1.9s ease-in-out infinite; }
.disco .ball::before { content: ''; position: absolute; left: 50%; top: -40vmin; height: 40vmin; border-left: 2px solid #ccc; }
.disco .title { position: absolute; top: 4%; width: 100%; text-align: center; font-size: 6vmin; color: #ffea00;
  text-shadow: 0 0 12px #ff1744, 3px 3px 0 #000; animation: disco-pulse 0.48s ease-in-out infinite alternate; }
.disco .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 30%; display: grid; grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(3, 1fr);
  transform: perspective(60vmin) rotateX(35deg); transform-origin: 50% 100%; }
.disco .floor div { border: 2px solid #000; animation: disco-tile 0.97s steps(1) infinite; }
.disco .dancers { position: absolute; left: 0; right: 0; bottom: 12%; display: flex; justify-content: center; align-items: flex-end; gap: 2vmin; }
.disco .dancer { position: relative; display: flex; flex-direction: column; align-items: center; }
.disco .dancer img { width: 16vmin; }
.disco .dancer.hero img { width: 24vmin; filter: drop-shadow(0 0 2vmin #ffea00); }
.disco .dancer .wave { position: absolute; top: -6vmin; font-size: 6vmin; opacity: 0; transition: opacity 0.3s; }
.disco.bye .dancer .wave { opacity: 1; animation: disco-wave 0.4s ease-in-out infinite alternate; }
.disco .bye-text { position: absolute; top: 18%; width: 100%; text-align: center; font-size: 9vmin; color: #fff; text-shadow: 4px 4px 0 #d500f9;
  opacity: 0; transition: opacity 0.3s; }
.disco.bye .bye-text { opacity: 1; }
.disco .reward { position: absolute; top: 36%; width: 100%; text-align: center; font-size: 4.5vmin; color: #fff; text-shadow: 3px 3px 0 #000;
  opacity: 0; transition: opacity 0.3s; }
.disco .reward .berry { display: block; font-size: 14vmin; animation: disco-pulse 0.3s ease-in-out infinite alternate; }
.disco.bye .reward { opacity: 1; }
.disco .d0 { animation: disco-bounce 0.48s ease-in-out infinite alternate; }
.disco .d1 { animation: disco-side 0.97s ease-in-out infinite; }
.disco .d2 { animation: disco-twirl 1.94s ease-in-out infinite; }
.disco .d3 { animation: disco-flip 1.94s ease-in-out infinite; }
.disco .hero-dance { animation: disco-hero 3.9s ease-in-out infinite; }
@keyframes disco-spin { to { transform: rotate(360deg); } }
@keyframes disco-swing { 0%, 100% { transform: translateX(-50%) rotate(-8deg); } 50% { transform: translateX(-50%) rotate(8deg); } }
@keyframes disco-pulse { to { transform: scale(1.08); } }
@keyframes disco-tile { 0% { background: #ff1744; } 25% { background: #00e5ff; } 50% { background: #ffea00; } 75% { background: #d500f9; } }
@keyframes disco-bounce { from { transform: translateY(0); } to { transform: translateY(-4vmin); } }
@keyframes disco-side { 0%, 100% { transform: translateX(-2vmin) rotate(-10deg); } 50% { transform: translateX(2vmin) rotate(10deg); } }
@keyframes disco-twirl { 0%, 60% { transform: scaleX(1); } 70% { transform: scaleX(-1); } 80% { transform: scaleX(1); } 90% { transform: scaleX(-1) translateY(-3vmin); } }
@keyframes disco-flip { 0%, 50% { transform: rotate(0); } 75% { transform: translateY(-8vmin) rotate(180deg); } 100% { transform: rotate(360deg); } }
@keyframes disco-hero { 0%, 100% { transform: translateY(0) rotate(0); } 12% { transform: translateY(-6vmin) rotate(0); } 25% { transform: translateY(0) scaleX(-1); }
  37% { transform: translateY(-3vmin) scaleX(-1) rotate(15deg); } 50% { transform: translateY(0) rotate(-15deg); } 62% { transform: translateY(-10vmin) rotate(360deg); }
  75% { transform: translateY(0) rotate(360deg); } 87% { transform: translateX(-3vmin) rotate(360deg); } }
@keyframes disco-wave { from { transform: rotate(-20deg); } to { transform: rotate(20deg); } }
`;

// Party capybaras in every color (hue-rotated suits)
const CAPYBARA_COLORS = [0, 120, 200, 290];

let styled = false;

export function showDisco({ hero, capybara, music, reward, onDone }) {
  if (!styled) {
    styled = true;
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  const room = document.createElement('div');
  room.className = 'disco';
  const tiles = Array.from({ length: 30 }, (_, i) => `<div style="animation-delay:-${((i * 7) % 4) * 0.24}s"></div>`).join('');
  const capy = (i) =>
    `<div class="dancer"><span class="wave">👋</span><img class="d${i}" src="${capybara}" style="filter:hue-rotate(${CAPYBARA_COLORS[i]}deg)"></div>`;
  room.innerHTML = `
    <div class="beams"></div>
    <div class="floor">${tiles}</div>
    <div class="ball">🪩</div>
    <div class="title">🪩 ${t('disco.title')} 🪩</div>
    <div class="dancers">${capy(0)}${capy(1)}<div class="dancer hero"><span class="wave">👋</span><img class="hero-dance" src="${hero}"></div>${capy(2)}${capy(3)}</div>
    <div class="bye-text">${t('disco.bye')}</div>
    <div class="reward">${reward ? `<span class="berry">${{ gold: '🌟🍓', red: '🍓', full: '🍓🍓🍓' }[reward]}</span>${t({ gold: 'strawberry.gotGold', red: 'strawberry.gotRed', full: 'strawberry.bagFull' }[reward])}` : ''}</div>`;
  document.body.appendChild(room);
  requestAnimationFrame(() => room.classList.add('show'));
  audio.play('shatter');
  audio.playMusic('disco');

  setTimeout(() => {
    room.classList.add('bye');
    audio.play('win');
  }, PARTY_MS);
  setTimeout(() => {
    room.classList.remove('show');
    if (music) audio.playMusic(music);
    else audio.stopMusic();
    setTimeout(() => {
      room.remove();
      onDone?.();
    }, 500);
  }, PARTY_MS + BYE_MS);
}

// A hero texture from Phaser as a picture URL for the party
export function heroPicture(textures, key) {
  return textures.exists(key) ? textures.getBase64(key) : '';
}
