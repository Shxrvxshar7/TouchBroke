// ── CHROME PANEL ─────────────────────────────────────────────────
// Google Chrome / Microsoft Edge
// Row 1: Open tab thumbnails — tap to switch
// Row 2: Navigation + bookmarks

export class ChromePanel {
  constructor({ row1, row2, send }) {
    this.row1 = row1;
    this.row2 = row2;
    this.send = send;
    this.tabs = [];
  }

  mount() {
    // Row 1 — tab strip
    this.row1.innerHTML = `
      <div class="tab-strip" id="tab-strip">
        <div style="color:var(--text-tertiary);font-size:12px;padding:0 8px;">
          Loading tabs...
        </div>
      </div>
    `;

    // Row 2 — navigation + bookmarks
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="tb-btn tb-btn--icon-only" data-action="back">
          <i data-lucide="arrow-left" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="forward">
          <i data-lucide="arrow-right" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="refresh">
          <i data-lucide="rotate-ccw" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="new_tab">
          <i data-lucide="plus" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group scroll-row" style="flex:1;">
        ${this._bookmarks().map(b => `
          <button class="bookmark-chip" data-url="${b.url}">
            <span class="bookmark-chip__icon">${b.icon}</span>
            <span>${b.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    this._wire();
  }

  _bookmarks() {
    return [
      { icon: '🤖', label: 'Claude',   url: 'https://claude.ai' },
      { icon: '📧', label: 'Gmail',    url: 'https://mail.google.com' },
      { icon: '📁', label: 'Drive',    url: 'https://drive.google.com' },
      { icon: '▶️', label: 'YouTube',  url: 'https://youtube.com' },
      { icon: '💬', label: 'WhatsApp', url: 'https://web.whatsapp.com' },
      { icon: '📸', label: 'Insta',    url: 'https://instagram.com' },
    ];
  }

  // Called from app.js when server sends tab list
  updateTabs(tabs) {
    this.tabs     = tabs;
    const strip   = document.getElementById('tab-strip');
    if (!strip) return;

    strip.innerHTML = '';

    tabs.forEach((tab, i) => {
      const chip = document.createElement('button');
      chip.className = `tab-chip${tab.active ? ' tab-chip--active' : ''}`;
      chip.innerHTML = `
        <span class="tab-chip__favicon">${tab.favicon || '🌐'}</span>
        <span class="tab-chip__title">${tab.title || 'Tab ' + (i + 1)}</span>
      `;

      chip.addEventListener('click', () => {
        strip.querySelectorAll('.tab-chip').forEach(c =>
          c.classList.remove('tab-chip--active')
        );
        chip.classList.add('tab-chip--active');
        this.send({ action: 'switch_tab', index: tab.index });
      });

      // Long press to close tab
      let pressTimer;
      chip.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
          chip.style.border = '1.5px solid var(--accent-red)';
          this.send({ action: 'close_tab', index: tab.index });
          setTimeout(() => chip.remove(), 200);
        }, 600);
      }, { passive: true });
      chip.addEventListener('touchend', () => clearTimeout(pressTimer));

      strip.appendChild(chip);
    });
  }

  _wire() {
    // Navigation buttons
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.send({ action: btn.dataset.action }));
    });

    // Bookmark chips
    this.row2.querySelectorAll('[data-url]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.send({ action: 'open_url', url: btn.dataset.url });
      });
    });
  }
}