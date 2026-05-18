// ── EXCEL PANEL ──────────────────────────────────────────────────
// Microsoft Excel
// Row 1: Cell reference + formula display
// Row 2: Excel-specific actions

export class ExcelPanel {
  constructor({ row1, row2, send }) {
    this.row1 = row1;
    this.row2 = row2;
    this.send = send;
  }

  mount() {
    // Row 1 — cell and formula bar
    this.row1.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;width:100%;height:100%;padding:8px 0;">
        <div style="
          font-size:13px;font-weight:700;
          color:var(--accent-blue);
          font-variant-numeric:tabular-nums;
          flex-shrink:0;min-width:40px;
        " id="excel-cell">A1</div>
        <div style="width:1px;height:28px;background:var(--separator);flex-shrink:0;"></div>
        <div style="
          font-size:12px;color:var(--text-primary);
          font-family:'Courier New',monospace;
          overflow:hidden;text-overflow:ellipsis;
          white-space:nowrap;flex:1;
        " id="excel-formula">—</div>
        <div style="
          font-size:12px;color:var(--accent-green);
          font-weight:600;flex-shrink:0;
        " id="excel-result"></div>
      </div>
    `;

    // Row 2 — excel actions
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="fmt-btn fmt-btn--wide" data-action="autosum">Σ</button>
        <button class="fmt-btn fmt-btn--wide" data-action="function">𝑓</button>
        <button class="fmt-btn fmt-btn--wide" data-action="percent">%</button>
        <button class="fmt-btn fmt-btn--wide" data-action="currency">$</button>
        <button class="fmt-btn fmt-btn--wide" data-action="comma">,</button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn" data-action="sort_asc">
          <i data-lucide="arrow-up-narrow-wide" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="sort_desc">
          <i data-lucide="arrow-down-wide-narrow" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="filter">
          <i data-lucide="filter" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn fmt-btn--wide" data-action="merge">Merge</button>
        <button class="tb-btn fmt-btn--wide" data-action="wrap">Wrap</button>
        <button class="tb-btn tb-btn--icon-only" data-action="borders">
          <i data-lucide="grid-3x3" class="icon"></i>
        </button>
      </div>
    `;

    this._wire();
  }

  // Called from app.js when server sends cell data
  updateCell(ref, formula, result) {
    const cellEl    = document.getElementById('excel-cell');
    const formulaEl = document.getElementById('excel-formula');
    const resultEl  = document.getElementById('excel-result');
    if (cellEl)    cellEl.textContent    = ref     || 'A1';
    if (formulaEl) formulaEl.textContent = formula || '—';
    if (resultEl)  resultEl.textContent  = result  || '';
  }

  _wire() {
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.send({ action: btn.dataset.action }));
    });
  }
}