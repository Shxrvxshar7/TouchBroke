// ── SPOTIFY PANEL ────────────────────────────────────────────────
// Spotify
// Row 1: Current lyric line or queue
// Row 2: Full playback controls

export class SpotifyPanel {
  constructor({ row1, row2, send }) {
    this.row1 = row1;
    this.row2 = row2;
    this.send = send;
  }

  mount() {
    // Row 1 — lyrics / queue context
    this.row1.innerHTML = `
      <div style="
        display:flex;align-items:center;
        width:100%;height:100%;padding:8px 0;
        font-size:13px;color:var(--text-secondary);
        font-style:italic;overflow:hidden;
      ">
        <span id="spotify-lyric" style="
          white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;width:100%;
          text-align:center;
        ">♪ Now Playing</span>
      </div>
    `;

    // Row 2 — playback controls
    this.row2.innerHTML = `
      <div class="btn-group">
        <button class="tb-btn tb-btn--icon-only" data-action="prev_track">
          <i data-lucide="skip-back" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="play_pause"
          style="width:60px;height:60px;border-radius:30px;background:var(--accent-blue);"
          id="spotify-playpause">
          <i data-lucide="pause" class="icon icon--lg"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="next_track">
          <i data-lucide="skip-forward" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn tb-btn--icon-only" id="spotify-shuffle" data-action="shuffle">
          <i data-lucide="shuffle" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="spotify-repeat" data-action="repeat">
          <i data-lucide="repeat" class="icon"></i>
        </button>
      </div>
      <div class="btn-group-sep"></div>
      <div class="btn-group">
        <button class="tb-btn tb-btn--icon-only like-btn" id="spotify-like" data-action="like">
          <i data-lucide="heart" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" data-action="add_to_playlist">
          <i data-lucide="list-plus" class="icon"></i>
        </button>
      </div>
    `;

    this._wire();
  }

  updatePlayback(isPlaying) {
    const btn = document.getElementById('spotify-playpause');
    if (!btn) return;
    btn.innerHTML = isPlaying
      ? '<i data-lucide="pause" class="icon icon--lg"></i>'
      : '<i data-lucide="play"  class="icon icon--lg"></i>';
    if (window.lucide) window.lucide.createIcons();
  }

  updateLyric(line) {
    const el = document.getElementById('spotify-lyric');
    if (el) el.textContent = line || '♪ Now Playing';
  }

  _wire() {
    this.row2.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'like') {
          btn.classList.toggle('like-btn--liked');
        }
        this.send({ action: btn.dataset.action });
      });
    });
  }
}