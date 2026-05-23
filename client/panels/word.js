// ── WORD PANEL ───────────────────────────────────────────────────
// Microsoft Word
// Row 1: Word suggestions (live as she types)
// Row 2: Full formatting toolbar

export class WordPanel {
  constructor({ row1, row2, send }) {
    this.row1 = row1;
    this.row2 = row2;
    this.send = send;
    this.activeFormats = new Set();
  }

  mount() {
    // Row 2 — formatting controls
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="fmt-btn" data-action="bold"><b>B</b></button>
        <button class="fmt-btn" style="font-style:italic" data-action="italic">I</button>
        <button class="fmt-btn" style="text-decoration:underline" data-action="underline">U</button>
        <button class="fmt-btn" style="text-decoration:line-through;font-size:13px" data-action="strikethrough">S</button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn tb-btn--icon-only" data-action="align_left">
          <i data-lucide="align-left" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="align_center">
          <i data-lucide="align-center" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="align_right">
          <i data-lucide="align-right" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="fmt-btn fmt-btn--wide" data-action="heading1">H1</button>
        <button class="fmt-btn fmt-btn--wide" data-action="heading2">H2</button>
        <button class="fmt-btn fmt-btn--wide" data-action="bullet_list">• List</button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn" data-action="undo">
          <i data-lucide="undo-2" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="redo">
          <i data-lucide="redo-2" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="color_picker">
          <i data-lucide="palette" class="icon"></i>
        </button>
      </div>
    `;

    this._wire();
  }

  _wire() {
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;

        // Toggle active state for formatting buttons
        if (['bold','italic','underline','strikethrough'].includes(action)) {
          btn.classList.toggle('fmt-btn--active');
        }

        this.send({ action });
      });
    });
  }
}