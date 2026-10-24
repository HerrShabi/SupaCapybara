import Phaser from 'phaser';

// The city in World 1: buildings, billboards, water towers, window-washer platforms, the helicopter.

const BUILDING_COLORS = [0x8d6e63, 0x78909c, 0xa1887f, 0x607d8b, 0x9e7f6e, 0x7986cb];
const WINDOW_DARK = 0x37474f;
export const WINDOW_LIGHT = 0xffe082;

// Same "random" result every time for the same window, so the city doesn't change between plays.
function noise(x, y) {
  return ((Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0) % 100;
}

// Draws a building's front. Window lights go on `lights`, which the scene fades in at night.
export function drawBuilding(g, lights, { x, width, roofY, bottom, colorIndex }) {
  const color = BUILDING_COLORS[colorIndex % BUILDING_COLORS.length];
  g.fillStyle(color);
  g.fillRect(x, roofY, width, bottom - roofY);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(30).color);
  g.fillRect(x - 4, roofY, width + 8, 10); // roof ledge

  for (let wy = roofY + 26; wy < bottom - 10; wy += 44) {
    for (let wx = x + 18; wx + 16 <= x + width - 12; wx += 38) {
      g.fillStyle(WINDOW_DARK);
      g.fillRect(wx, wy, 16, 24);
      if (noise(wx, wy) < 60) {
        lights.fillStyle(WINDOW_LIGHT);
        lights.fillRect(wx, wy, 16, 24);
      }
    }
  }
}

// Billboard on two poles. The board itself (top..top+height) is what you stand on.
export function drawBillboard(g, { x, top, width, height, roofY }) {
  g.fillStyle(0x546e7a);
  g.fillRect(x + 20, top + height, 8, roofY - top - height);
  g.fillRect(x + width - 28, top + height, 8, roofY - top - height);
  g.fillStyle(0x263238);
  g.fillRect(x, top, width, height);
  g.fillStyle(0xfff8e1);
  g.fillRect(x + 4, top + 4, width - 8, height - 8);
}

// Wooden water tower on legs. The tank is what you stand on.
export function drawWaterTower(g, { x, top, width, height, roofY }) {
  const legsTop = top + height;
  g.lineStyle(5, 0x5d4037);
  g.lineBetween(x + 10, legsTop, x + 4, roofY);
  g.lineBetween(x + width - 10, legsTop, x + width - 4, roofY);
  g.lineStyle(3, 0x5d4037);
  g.lineBetween(x + 8, legsTop + 4, x + width - 6, roofY - 4);
  g.lineBetween(x + width - 8, legsTop + 4, x + 6, roofY - 4);
  g.fillStyle(0xa1673f);
  g.fillRoundedRect(x, top, width, height, 6);
  g.fillStyle(0x6d4c41);
  g.fillRect(x, top + 16, width, 5);
  g.fillRect(x, top + height - 20, width, 5);
}

// Skyline far away: building shapes with windows that light up at night.
export function drawSkyline(g, lights, width, baseY) {
  for (let x = 0; x < width; x += 70) {
    const w = 50 + (noise(x, 1) % 40);
    const h = 120 + (noise(x, 2) % 4) * 45;
    g.fillStyle(0x546e8a);
    g.fillRect(x, baseY - h, w, h + 200);
    for (let wy = baseY - h + 12; wy < baseY; wy += 22) {
      for (let wx = x + 8; wx + 6 <= x + w - 6; wx += 14) {
        if (noise(wx, wy) < 35) {
          lights.fillStyle(WINDOW_LIGHT, 0.8);
          lights.fillRect(wx, wy, 6, 9);
        }
      }
    }
  }
}

// The helicopter Pizza Boss jumps out of (faces left), and its spinning rotor.
export function createHelicopterTextures(scene) {
  if (!scene.textures.exists('helicopter')) {
    const g = scene.make.graphics({ add: false });
    // Tail
    g.fillStyle(0xb71c1c);
    g.fillRect(100, 40, 92, 12);
    g.fillStyle(0x424242);
    g.fillCircle(190, 44, 12);
    // Body and window
    g.fillStyle(0xd32f2f);
    g.fillEllipse(70, 50, 120, 60);
    g.fillStyle(0x81d4fa);
    g.fillEllipse(40, 44, 50, 30);
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(34, 38, 18, 8);
    // Mast and skids
    g.fillStyle(0x424242);
    g.fillRect(64, 12, 10, 10);
    g.lineStyle(4, 0x424242);
    g.lineBetween(40, 78, 46, 90);
    g.lineBetween(100, 78, 94, 90);
    g.lineBetween(20, 90, 120, 90);
    g.generateTexture('helicopter', 204, 94);
    g.destroy();
  }
  if (!scene.textures.exists('rotor')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x212121);
    g.fillRoundedRect(0, 0, 220, 8, 4);
    g.generateTexture('rotor', 220, 8);
    g.destroy();
  }
}

// The rocket that lands on the helipad and blasts off to World 2, and its flame.
export function createRocketTextures(scene) {
  if (!scene.textures.exists('rocket')) {
    const g = scene.make.graphics({ add: false });
    // Fins
    g.fillStyle(0xd32f2f);
    g.fillTriangle(6, 150, 26, 100, 26, 150);
    g.fillTriangle(84, 150, 64, 100, 64, 150);
    // Body
    g.fillStyle(0xeceff1);
    g.fillRoundedRect(22, 40, 46, 112, 12);
    g.fillStyle(0xb0bec5);
    g.fillRect(22, 132, 46, 6);
    // Nose cone
    g.fillStyle(0xd32f2f);
    g.fillTriangle(22, 46, 68, 46, 45, 0);
    // Window
    g.fillStyle(0x37474f);
    g.fillCircle(45, 76, 13);
    g.fillStyle(0x81d4fa);
    g.fillCircle(45, 76, 10);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(41, 72, 3);
    g.generateTexture('rocket', 90, 156);
    g.destroy();
  }
  if (!scene.textures.exists('flame')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xff6f00);
    g.fillTriangle(0, 0, 40, 0, 20, 70);
    g.fillStyle(0xffeb3b);
    g.fillTriangle(8, 0, 32, 0, 20, 44);
    g.generateTexture('flame', 40, 70);
    g.destroy();
  }
}
