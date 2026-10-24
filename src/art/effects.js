// Attack and power effects: lasers, scratch, fire aura, double-jump puff, lock icon.

function make(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createEffectTextures(scene) {
  make(scene, 'laser', 70, 14, (g) => {
    g.fillStyle(0xff2020, 0.5);
    g.fillRoundedRect(0, 0, 70, 14, 7);
    g.fillStyle(0xff3030);
    g.fillRoundedRect(3, 3, 64, 8, 4);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(8, 5, 54, 4, 2);
  });

  // Ultra Capybara's super laser: bigger, pink and purple.
  make(scene, 'super-laser', 96, 24, (g) => {
    g.fillStyle(0xd500f9, 0.45);
    g.fillRoundedRect(0, 0, 96, 24, 12);
    g.fillStyle(0xff4fd8);
    g.fillRoundedRect(4, 5, 88, 14, 7);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(10, 9, 76, 6, 3);
  });

  // Golden Capybara's golden laser.
  make(scene, 'gold-laser', 96, 24, (g) => {
    g.fillStyle(0xffab00, 0.45);
    g.fillRoundedRect(0, 0, 96, 24, 12);
    g.fillStyle(0xffd54f);
    g.fillRoundedRect(4, 5, 88, 14, 7);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(10, 9, 76, 6, 3);
  });

  // Three claw marks for Supa Cat's scratch.
  make(scene, 'slash', 70, 64, (g) => {
    for (let i = 0; i < 3; i++) {
      g.lineStyle(9, 0xff3b3b, 0.6);
      g.lineBetween(8 + i * 16, 56, 30 + i * 16, 6);
      g.lineStyle(4, 0xffffff);
      g.lineBetween(8 + i * 16, 56, 30 + i * 16, 6);
    }
  });

  // Ultra Capybara's pink fire aura.
  make(scene, 'aura', 130, 100, (g) => {
    const layers = [
      [130, 100, 0.15],
      [112, 86, 0.2],
      [94, 72, 0.25],
    ];
    for (const [w, h, alpha] of layers) {
      g.fillStyle(0xff4fd8, alpha);
      g.fillEllipse(65, 50, w, h);
    }
    // Flame tips around the edge
    g.fillStyle(0xd500f9, 0.35);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const x = 65 + Math.cos(angle) * 52;
      const y = 50 + Math.sin(angle) * 40;
      g.fillTriangle(x - 7, y, x + 7, y, x + Math.cos(angle) * 14, y + Math.sin(angle) * 14 - 6);
    }
  });

  // Golden Capybara's golden aura.
  make(scene, 'aura-gold', 130, 100, (g) => {
    const layers = [
      [130, 100, 0.15],
      [112, 86, 0.2],
      [94, 72, 0.25],
    ];
    for (const [w, h, alpha] of layers) {
      g.fillStyle(0xffd54f, alpha);
      g.fillEllipse(65, 50, w, h);
    }
    // Flame tips around the edge
    g.fillStyle(0xff8f00, 0.35);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const x = 65 + Math.cos(angle) * 52;
      const y = 50 + Math.sin(angle) * 40;
      g.fillTriangle(x - 7, y, x + 7, y, x + Math.cos(angle) * 14, y + Math.sin(angle) * 14 - 6);
    }
  });

  make(scene, 'puff', 20, 20, (g) => {
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(10, 10, 10);
  });

  make(scene, 'lock', 30, 36, (g) => {
    g.lineStyle(5, 0x9aa0aa);
    g.strokeCircle(15, 13, 9);
    g.fillStyle(0xffc107);
    g.fillRoundedRect(2, 14, 26, 21, 4);
    g.fillStyle(0x6d4c00);
    g.fillCircle(15, 23, 3);
    g.fillRect(14, 23, 3, 7);
  });
}

// The Shield as a wall: a see-through blue wall in front of you.
export function createShieldTexture(scene) {
  make(scene, 'shield-wall', 20, 96, (g) => {
    g.fillStyle(0x4fc3f7, 0.45);
    g.fillRoundedRect(0, 0, 20, 96, 8);
    g.lineStyle(3, 0xb3e5fc, 0.95);
    g.strokeRoundedRect(1.5, 1.5, 17, 93, 7);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(5, 10, 3, 40);
  });
}

// The Shield as a bubble (with the Multi Direction Upgrade): protects you from every side.
export function createBubbleTexture(scene) {
  make(scene, 'shield-bubble', 150, 130, (g) => {
    g.fillStyle(0x4fc3f7, 0.22);
    g.fillEllipse(75, 65, 150, 130);
    g.lineStyle(4, 0xb3e5fc, 0.9);
    g.strokeEllipse(75, 65, 144, 124);
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(45, 30, 30, 14);
  });
}

// Power-up and new-hero things: the Mecha Capybara suit, its rockets, and Bloodmoon Cat's red moon.
export function createPowerTextures(scene) {
  // Giant robot capybara suit (faces right, like the heroes). Same frame shape as a hero, drawn bigger in the game.
  make(scene, 'mecha', 64, 48, (g) => {
    g.fillStyle(0x455a64);
    g.fillRect(14, 34, 10, 13); // legs
    g.fillRect(40, 34, 10, 13);
    g.fillStyle(0x263238);
    g.fillRect(12, 44, 14, 4); // feet
    g.fillRect(38, 44, 14, 4);
    g.fillStyle(0x90a4ae);
    g.fillRoundedRect(8, 14, 44, 24, 6); // body
    g.fillStyle(0xffd23f);
    g.fillRect(22, 22, 14, 4); // stripe
    g.fillStyle(0x607d8b);
    g.fillRoundedRect(40, 4, 22, 20, 5); // head
    g.fillStyle(0xff1744);
    g.fillRect(48, 9, 12, 5); // red visor
    g.fillStyle(0x37474f);
    g.fillRect(2, 8, 14, 9); // rocket launcher on the back
    g.fillStyle(0xff7043);
    g.fillCircle(3, 12, 3);
    g.fillStyle(0xb0bec5);
    g.fillCircle(44, 3, 3); // antenna
  });

  make(scene, 'rocket-shot', 40, 16, (g) => {
    g.fillStyle(0xff7043, 0.7);
    g.fillTriangle(0, 8, 12, 2, 12, 14); // flame at the back
    g.fillStyle(0xeceff1);
    g.fillRoundedRect(10, 3, 24, 10, 4);
    g.fillStyle(0xd32f2f);
    g.fillTriangle(34, 3, 40, 8, 34, 13);
  });

  make(scene, 'red-moon', 34, 34, (g) => {
    g.fillStyle(0xff1744, 0.35);
    g.fillCircle(17, 17, 17);
    g.fillStyle(0xd50000);
    g.fillCircle(17, 17, 12);
    g.fillStyle(0x9b0000);
    g.fillCircle(13, 13, 3);
    g.fillCircle(21, 20, 2.5);
    g.fillCircle(14, 22, 2);
  });
}
