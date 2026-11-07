import Phaser from 'phaser';

// A comic book speech bubble (Phaser): white, thick black outline, a pointy tail down to the speaker's head.
// spot: where the speaker is (world coordinates). view: the camera's worldView. side (-1 or 1): the bubble
// sticks out that way, so it doesn't cover what the speaker points at. hint: a small gray line under the words.
// Returns the objects it made, so the caller can destroy them.
export function drawComicBubble(scene, text, spot, view, side, hint = '') {
  const words = scene.add
    .text(0, 0, text, { fontFamily: 'Comic Sans MS, Chalkboard SE, Arial Black, Arial', fontSize: '19px', color: '#000000', align: 'center', wordWrap: { width: 300 } })
    .setOrigin(0.5, 0)
    .setDepth(14);
  const small = scene.add.text(0, 0, hint, { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#666666' }).setOrigin(0.5, 0).setDepth(14);
  const width = Math.max(words.width, small.width) + 36;
  const height = words.height + small.height + 30;
  const centerX = Phaser.Math.Clamp(spot.x + side * (width / 2 - 50), view.x + width / 2 + 10, view.right - width / 2 - 10);
  const head = { x: spot.x, y: spot.y - 26 };
  let top = head.y - 40 - height;
  let tailBase = top + height;
  if (top < view.y + 8) {
    // No room above: the bubble goes under the speaker, tail pointing up
    top = spot.y + 60;
    tailBase = top;
    head.y = spot.y + 26;
  }
  words.setPosition(centerX, top + 12);
  small.setPosition(centerX, top + 18 + words.height);

  const g = scene.add.graphics().setDepth(13);
  const tailX = Phaser.Math.Clamp(head.x, centerX - width / 2 + 24, centerX + width / 2 - 24);
  g.fillStyle(0xffffff).lineStyle(4, 0x000000);
  g.fillTriangle(tailX - 14, tailBase, tailX + 14, tailBase, head.x, head.y);
  g.strokeTriangle(tailX - 14, tailBase, tailX + 14, tailBase, head.x, head.y);
  g.fillRoundedRect(centerX - width / 2, top, width, height, 18);
  g.strokeRoundedRect(centerX - width / 2, top, width, height, 18);
  g.fillRect(tailX - 11, tailBase - 4, 22, 8); // join the tail to the bubble (hide the outline there)
  return [g, words, small];
}
