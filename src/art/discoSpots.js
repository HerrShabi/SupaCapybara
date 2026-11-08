// Where the secret capybara disco hides (see disco.js). SideScrollerScene draws level.disco.prop here, then the
// crack on top at (x, y). Worlds 1, 3 and 8 hide the crack in scenery they already have (no prop).
//   pot:   a pot at the end of a rainbow; `ground` is where it stands
//   clam:  a giant clam on the sea floor; `ground` is the floor
//   trunk: a tall hollow tree trunk from `ground` up past the crack
//   brick: one odd brick in the castle wall

export function drawDiscoProp(scene, { prop, x, y, ground }) {
  const g = scene.add.graphics().setDepth(1.3);
  if (prop === 'pot') {
    // The rainbow comes down into the pot
    const colors = [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0xaa00ff];
    colors.forEach((color, i) => {
      g.lineStyle(6, color, 0.85);
      g.beginPath();
      g.arc(x - 75, ground - 20, 80 - i * 6, Math.PI, 0);
      g.strokePath();
    });
    g.fillStyle(0x212121).fillEllipse(x, ground - 20, 52, 40);
    g.fillStyle(0x424242).fillRect(x - 28, ground - 42, 56, 9);
    g.fillStyle(0xffd23f).fillCircle(x - 12, ground - 44, 5).fillCircle(x + 2, ground - 46, 5).fillCircle(x + 14, ground - 44, 5);
  } else if (prop === 'clam') {
    g.fillStyle(0xf8bbd0).fillEllipse(x, ground - 14, 96, 34);
    g.fillStyle(0xf48fb1).fillEllipse(x, ground - 30, 92, 40);
    g.lineStyle(3, 0xec407a);
    for (let i = -2; i <= 2; i++) g.lineBetween(x, ground - 10, x + i * 18, ground - 46);
    g.fillStyle(0xffffff).fillCircle(x + 36, ground - 16, 6); // a pearl peeking out
  } else if (prop === 'trunk') {
    g.fillStyle(0x4e342e).fillRect(x - 22, y - 120, 44, ground - y + 120);
    g.fillStyle(0x3e2723).fillRect(x - 10, y - 100, 6, ground - y + 80).fillRect(x + 8, y - 60, 5, ground - y + 40);
    g.fillStyle(0x2e7d32).fillCircle(x, y - 130, 56).fillCircle(x - 44, y - 110, 38).fillCircle(x + 46, y - 112, 40);
  } else if (prop === 'brick') {
    g.fillStyle(0x8d8d8d).fillRect(x - 26, y - 14, 52, 28);
    g.lineStyle(2, 0x5f5f5f).strokeRect(x - 26, y - 14, 52, 28);
  }
  return g;
}
