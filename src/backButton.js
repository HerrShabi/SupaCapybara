import { t } from './i18n.js';
import { audio } from './audio.js';

// A big "◀ BACK" button for menus, so iPad and iPhone players (no ESC key) can always go back.
export function addBackButton(scene, x, y, onBack, width = 120) {
  const button = scene.add
    .rectangle(x, y, width, 30, 0x37474f)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      audio.play('click');
      onBack();
    });
  const label = scene.add.text(x, y, `◀ ${t('menu.backButton')}`, { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
  label.setScale(Math.min(1, (width - 12) / label.width));
  return [button, label];
}
