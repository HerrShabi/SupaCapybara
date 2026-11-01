// A simple list on top of the 3D view, for the team tent and the food shop at base camp.
// QuestWorld moves the selection and picks with the keys (so touch buttons and game controllers work too).

const STYLE = `
  .q-menu { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.45); font-family: 'Arial Black', Arial, sans-serif; color: #fff; user-select: none; z-index: 5;
    text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000; }
  .q-panel { background: #4a2c6e; border: 5px solid #ffd23f; border-radius: 18px; padding: 16px 26px; min-width: 440px; max-width: 80%; }
  .q-title { font-size: 30px; text-align: center; color: #ffd23f; }
  .q-sub { font-size: 16px; text-align: center; margin: 4px 0 10px; }
  .q-rows { max-height: 52vh; overflow: hidden; }
  .q-row { font-size: 20px; padding: 5px 12px; border-radius: 10px; border: 3px solid transparent; display: flex; justify-content: space-between; gap: 20px; }
  .q-row.picked { border-color: #ffd23f; background: rgba(255,210,63,0.25); }
  .q-row .note { color: #b9f6ca; }
  .q-help { font-size: 13px; text-align: center; margin-top: 10px; }
`;

export class QuestMenu {
  // rows(): the list to show, as [{ text, note }]. sub(): a line under the title (can change, like your bolts).
  constructor(container, { title, sub = () => '', help, rows }) {
    this.rows = rows;
    this.sub = sub;
    this.index = 0;
    this.root = document.createElement('div');
    this.root.className = 'q-menu';
    this.root.innerHTML = `<style>${STYLE}</style>
      <div class="q-panel"><div class="q-title">${title}</div><div class="q-sub"></div><div class="q-rows"></div><div class="q-help">${help}</div></div>`;
    container.appendChild(this.root);
    this.render();
  }

  move(delta) {
    const count = this.rows().length;
    if (count) this.index = (this.index + delta + count) % count;
    this.render();
  }

  render() {
    this.root.querySelector('.q-sub').textContent = this.sub();
    const rows = this.root.querySelector('.q-rows');
    rows.innerHTML = '';
    this.rows().forEach((row, i) => {
      const div = document.createElement('div');
      div.className = `q-row${i === this.index ? ' picked' : ''}`;
      div.innerHTML = `<span></span><span class="note"></span>`;
      div.children[0].textContent = row.text;
      div.children[1].textContent = row.note ?? '';
      rows.appendChild(div);
    });
    rows.children[this.index]?.scrollIntoView({ block: 'nearest' });
  }

  destroy() {
    this.root.remove();
  }
}
