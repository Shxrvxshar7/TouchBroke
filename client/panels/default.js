// ── DEFAULT PANEL ────────────────────────────────────────────────
// Shown when active app is unknown.
// Row 1: Word suggestions (already handled by WordSuggestions component)
// Row 2: Universal shortcuts — formatting, clipboard, function keys

export class DefaultPanel {
  constructor({ row1, row2, send }) {
    this.row1 = row1;
    this.row2 = row2;
    this.send = send;
  }

  mount() {
    // Row 1 — word suggestions already mounted by app.js
    // Nothing extra needed here

    // Row 2 — universal shortcuts
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="fmt-btn" data-action="bold"><b>B</b></button>
        <button class="fmt-btn" style="font-style:italic" data-action="italic">I</button>
        <button class="fmt-btn" style="text-decoration:underline" data-action="underline">U</button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn" data-action="copy">
          <i data-lucide="copy" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="paste">
          <i data-lucide="clipboard" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="undo">
          <i data-lucide="undo-2" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="redo">
          <i data-lucide="redo-2" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group scroll-row" style="flex:1;">
        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n =>
          `<button class="tb-btn" data-action="f${n}">F${n}</button>`
        ).join('')}
      </div>
    `;

    this._wire();
  }

  _wire() {
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.send({ action: btn.dataset.action });
      });
    });
  }
}