// Pizza Boss from Ethan's drawing (concept-art/bosses.jpeg):
// a pizza slice with a blaster in each hand and spiky metal legs.

export const PIZZA_WIDTH = 140;
export const PIZZA_HEIGHT = 160;

export function createPizzaBossTexture(scene) {
  if (scene.textures.exists('pizza-boss')) return;
  const g = scene.make.graphics({ add: false });

  // Legs with spiky metal feet
  g.lineStyle(5, 0x1a2a6c);
  g.lineBetween(62, 100, 50, 132);
  g.lineBetween(78, 100, 90, 132);
  g.fillStyle(0x9aa0aa);
  g.fillTriangle(36, 132, 64, 132, 44, 158);
  g.fillTriangle(48, 132, 64, 132, 58, 152);
  g.fillTriangle(76, 132, 104, 132, 96, 158);
  g.fillTriangle(76, 132, 92, 132, 82, 152);

  // Arms holding blasters
  g.lineStyle(5, 0x1a2a6c);
  g.lineBetween(34, 40, 14, 72);
  g.lineBetween(106, 40, 126, 72);
  g.fillStyle(0x1a2a6c);
  g.fillRect(0, 66, 26, 12);
  g.fillRect(114, 66, 26, 12);
  g.fillRect(4, 78, 6, 10);
  g.fillRect(130, 78, 6, 10);

  // Slice (tip down) with cheese and crust
  g.fillStyle(0xffc84a);
  g.fillTriangle(22, 22, 118, 22, 70, 112);
  g.fillStyle(0xffe08a);
  g.fillTriangle(40, 26, 100, 26, 70, 84);
  g.fillStyle(0xc77a2a);
  g.fillRoundedRect(16, 8, 108, 20, 9);
  g.fillStyle(0xe8a050);
  g.fillRoundedRect(22, 11, 96, 6, 3);

  // Pepperoni
  g.fillStyle(0xc0392b);
  g.fillCircle(46, 40, 7);
  g.fillCircle(92, 44, 7);
  g.fillCircle(72, 82, 6);

  // One big angry eye
  g.fillStyle(0xffffff);
  g.fillCircle(68, 50, 13);
  g.fillStyle(0xf1c40f);
  g.fillCircle(70, 52, 8);
  g.fillStyle(0x000000);
  g.fillCircle(71, 53, 4);
  g.lineStyle(4, 0x000000);
  g.lineBetween(54, 34, 80, 40);

  // Mouth
  g.lineStyle(3, 0x7a2a10);
  g.lineBetween(62, 70, 78, 68);

  g.generateTexture('pizza-boss', PIZZA_WIDTH, PIZZA_HEIGHT);
  g.destroy();
}
