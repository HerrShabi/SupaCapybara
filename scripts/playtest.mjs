// Plays the game in headless Chrome with real key presses (needs `npm run dev` running).
// Usage: node scripts/playtest.mjs '[["eval","S.player.setPosition(3700, 380), 1"],["hold","right",1000],["down","x"],["wait",500],["up","x"],["shot","name"]]'
// Steps: touchdown <x> <y> | touchup | hold <key> <ms> | down <key> | up <key> | wait <ms> | click <x> <y> (game coordinates) | shot <name> (saved to /tmp/supercapybara-<name>.png)
//        eval <js> where "S." means the World1 scene and "M." the Menu scene. Keys: right, left, up, down, enter, esc, shift, space, or any single letter (x, c, v...).
//        The game starts on the Title screen (ENTER there goes to the Menu). Saved progress stays between runs; eval "localStorage.clear()" to reset it.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.rmSync('/tmp/supercapybara-playtest-profile', { recursive: true, force: true }); // a fresh browser every time
const chrome = spawn(CH, ['--headless=new', '--remote-debugging-port=9333', '--window-size=960,540', '--user-data-dir=/tmp/supercapybara-playtest-profile', '--use-angle=swiftshader-webgl', 'about:blank'], { stdio: 'ignore', detached: true });
// Always close the whole browser (leftover test browsers stop 3D from working in the next run).
process.on('exit', () => {
  try {
    process.kill(-chrome.pid, 'SIGKILL');
  } catch {}
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
const page = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const logs = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') logs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 400)); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value).join(' ')); if (pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const keys = { right: ['ArrowRight', 'ArrowRight', 39], left: ['ArrowLeft', 'ArrowLeft', 37], x: ['x', 'KeyX', 88], up: ['ArrowUp', 'ArrowUp', 38], down: ['ArrowDown', 'ArrowDown', 40], c: ['c', 'KeyC', 67], enter: ['Enter', 'Enter', 13], esc: ['Escape', 'Escape', 27], shift: ['Shift', 'ShiftLeft', 16], space: [' ', 'Space', 32] };
const key = (type, name) => { const [k, code, kc] = keys[name] ?? [name, `Key${name.toUpperCase()}`, name.toUpperCase().charCodeAt(0)]; return send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: kc }); };
const hold = async (name, ms) => { await key('keyDown', name); await sleep(ms); await key('keyUp', name); };
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value ?? "(object)";
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`/tmp/supercapybara-${name}.png`, Buffer.from(s.data, 'base64')); };
const scene = 'game.scene.getScene("World1")';
await send('Runtime.enable');
await send('Page.navigate', { url: 'http://localhost:5173/' });
await sleep(2500);
for (const step of JSON.parse(process.argv[2])) {
  const [cmd, a, b] = step;
  if (cmd === 'hold') await hold(a, b);
  if (cmd === 'down') await key('keyDown', a);
  if (cmd === 'up') await key('keyUp', a);
  if (cmd === 'wait') await sleep(a);
  if (cmd === 'shot') await shot(a);
  // touchdown x y / touchup: a finger on the page (page pixels, like the screenshots).
  if (cmd === 'touchdown') await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a, y: b }] });
  if (cmd === 'touchup') await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (cmd === 'click') {
    // a, b are game coordinates (960x540); convert to where the canvas is on the page.
    const [x, y] = await evalJs(`(() => { const r = game.canvas.getBoundingClientRect(); return [r.left + ${a} * r.width / 960, r.top + ${b} * r.height / 540]; })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
  if (cmd === 'eval') console.log(a, '=>', JSON.stringify(await evalJs(a.replaceAll('S.', scene + '.').replaceAll('M.', 'game.scene.getScene("Menu").'))));
}
console.log('errors:', logs.length ? logs : 'none');
ws.close();
process.exit(0);
