// ── POWERPOINT PANEL ─────────────────────────────────────────────
// Microsoft PowerPoint + Canva
// Row 1: Slide strip — swipe to navigate, tap to jump
// Row 2: Presentation controls

export class PowerPointPanel {
  constructor({ row1, row2, send }) {
    this.row1        = row1;
    this.row2        = row2;
    this.send        = send;
    this.slides      = [];
    this.currentSlide= 0;
  }

  mount() {
    // Row 1 — slide strip
    this.row1.innerHTML = `
      <div class="slide-strip" id="slide-strip">
        <div style="color:var(--text-tertiary);font-size:12px;padding:0 8px;">
          Waiting for slides...
        </div>
      </div>
    `;

    // Row 2 — presentation controls
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="tb-btn fmt-btn--wide" data-action="present"
          style="background:var(--accent-green);color:#000;font-weight:700;">
          ▶ Present
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn tb-btn--icon-only" data-action="prev_slide">
          <i data-lucide="chevron-left" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="next_slide">
          <i data-lucide="chevron-right" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="fmt-btn" data-action="bold"><b>B</b></button>
        <button class="fmt-btn" style="font-style:italic" data-action="italic">I</button>
        <button class="fmt-btn" style="text-decoration:underline" data-action="underline">U</button>
        <button class="tb-btn tb-btn--icon-only" data-action="color_picker">
          <i data-lucide="palette" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn fmt-btn--wide" data-action="insert_text">+Text</button>
        <button class="tb-btn fmt-btn--wide" data-action="insert_image">+Img</button>
      </div>
    `;

    this._wire();
  }

  // Called from app.js when server sends slide data
  updateSlides(slides, currentIndex) {
    this.slides       = slides;
    this.currentSlide = currentIndex;

    const strip = document.getElementById('slide-strip');
    if (!strip) return;

    strip.innerHTML = '';

    slides.forEach((slide, i) => {
      const thumb = document.createElement('button');
      thumb.className = `slide-thumb${i === currentIndex ? ' slide-thumb--active' : ''}`;

      // Show thumbnail image if available, else slide number
      if (slide.thumbnail) {
        thumb.innerHTML = `
          <img src="${slide.thumbnail}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
          <span class="slide-number">${i + 1}</span>
        `;
      } else {
        thumb.innerHTML = `
          <span style="font-size:13px;font-weight:600;">${i + 1}</span>
          <span class="slide-number">${i + 1}</span>
        `;
      }

      thumb.addEventListener('click', () => {
        // Update active state
        strip.querySelectorAll('.slide-thumb').forEach(t =>
          t.classList.remove('slide-thumb--active')
        );
        thumb.classList.add('slide-thumb--active');
        this.currentSlide = i;
        this.send({ action: 'goto_slide', index: i });
      });

      strip.appendChild(thumb);
    });

    // Scroll active slide into view
    const activeThumb = strip.children[currentIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  _wire() {
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.send({ action: btn.dataset.action }));
    });
  }
}