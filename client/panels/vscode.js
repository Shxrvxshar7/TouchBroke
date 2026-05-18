// ── VSCODE PANEL ─────────────────────────────────────────────────
// Visual Studio Code
// Row 1: File info, error count, git branch
// Row 2: Run, debug, shortcuts

export class VSCodePanel {
  constructor({ row1, row2, send }) {
    this.row1 = row1;
    this.row2 = row2;
    this.send = send;
  }

  mount() {
    // Row 1 — status context
    this.row1.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;width:100%;height:100%;padding:8px 0;overflow:hidden;">
        <div class="error-badge error-badge--error" id="vs-errors">
          <i data-lucide="x-circle" class="icon icon--sm"></i>
          <span id="vs-error-count">0</span>
        </div>
        <div class="error-badge error-badge--warn" id="vs-warnings">
          <i data-lucide="alert-triangle" class="icon icon--sm"></i>
          <span id="vs-warn-count">0</span>
        </div>
        <div class="file-info" style="flex:1;overflow:hidden;">
          <i data-lucide="file-code" class="icon icon--sm"></i>
          <span class="file-info__name" id="vs-filename">No file</span>
          <span id="vs-position" style="color:var(--text-tertiary);font-size:11px;">Ln 1, Col 1</span>
        </div>
        <div class="git-branch" id="vs-branch">
          <i data-lucide="git-branch" class="icon icon--sm"></i>
          <span id="vs-branch-name">main</span>
        </div>
      </div>
    `;

    // Row 2 — developer actions
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="tb-btn" data-action="run" style="color:var(--accent-green);">
          <i data-lucide="play" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="stop" style="color:var(--accent-red);">
          <i data-lucide="square" class="icon"></i>
        </button>
        <button class="tb-btn" data-action="debug">
          <i data-lucide="bug" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn fmt-btn--wide" data-action="comment">//</button>
        <button class="tb-btn tb-btn--icon-only" data-action="delete_line">
          <i data-lucide="trash-2" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="duplicate_line">
          <i data-lucide="copy" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn fmt-btn--wide" data-action="command_palette">⌘P</button>
        <button class="tb-btn fmt-btn--wide" data-action="quick_open">⌘⇧P</button>
        <button class="tb-btn fmt-btn--wide" data-action="terminal">Term</button>
      </div>
    `;

    this._wire();
  }

  // Called from app.js when server sends VS Code status
  updateStatus({ errors, warnings, filename, line, col, branch }) {
    const ec = document.getElementById('vs-error-count');
    const wc = document.getElementById('vs-warn-count');
    const fn = document.getElementById('vs-filename');
    const pos= document.getElementById('vs-position');
    const br = document.getElementById('vs-branch-name');

    if (ec)  ec.textContent  = errors   || 0;
    if (wc)  wc.textContent  = warnings || 0;
    if (fn)  fn.textContent  = filename || 'No file';
    if (pos) pos.textContent = `Ln ${line || 1}, Col ${col || 1}`;
    if (br)  br.textContent  = branch   || 'main';
  }

  _wire() {
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.send({ action: btn.dataset.action }));
    });
  }
}