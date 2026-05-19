// ── NOW PLAYING — DYNAMIC ISLAND ────────────────────────────────
// Manages the 4-size Now Playing component.
// Driven by Spotify Web API data sent from Python server.
// Album art color tinting via ColorExtractor.

import { Haptics }        from '../utils/haptics.js';
import { WS }             from '../utils/websocket.js';
import { ColorExtractor } from '../utils/color-extractor.js';

const NowPlaying = (() => {

  // ── STATE ─────────────────────────────────────────────────────
  let currentSize   = 1;
  let currentTrack  = null;
  let progressTimer = null;
  let progressMs    = 0;
  let isPlaying     = false;
  let isLiked       = false;

  // ── DOM REFS ──────────────────────────────────────────────────
  const pill        = document.getElementById('now-playing-pill');
  const pillArt     = document.getElementById('pill-art');
  const pillTitle   = document.getElementById('pill-title');
  const row3        = document.getElementById('row3');

  // Size 3 expanded panel — created dynamically
  let expandedEl    = null;

  // Size 4 fullscreen — created dynamically
  let fullscreenEl  = null;

  // ── FORMAT TIME ───────────────────────────────────────────────
  function formatMs(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min      = Math.floor(totalSec / 60);
    const sec      = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // ── BUILD EXPANDED PANEL (Size 3) ────────────────────────────
  function buildExpanded() {
    if (expandedEl) expandedEl.remove();

    expandedEl = document.createElement('div');
    expandedEl.className = 'now-playing-expanded';
    expandedEl.innerHTML = `
      <div class="npe__row">
        <div class="npe__art" id="npe-art">
          <img id="npe-art-img" src="" alt="Album art" crossorigin="anonymous" />
        </div>
        <div class="npe__info">
          <div class="npe__title"  id="npe-title">-</div>
          <div class="npe__artist" id="npe-artist">-</div>
          <div class="npe__album"  id="npe-album">-</div>
        </div>
        <div class="npe__controls">
          <button class="tb-btn tb-btn--icon-only like-btn" id="npe-like">
            <i data-lucide="heart" class="icon"></i>
          </button>
        </div>
      </div>

      <div class="progress-wrap">
        <div class="progress-track" id="npe-progress-track">
          <div class="progress-fill" id="npe-progress-fill"></div>
        </div>
        <div class="progress-times">
          <span class="progress-time" id="npe-elapsed">0:00</span>
          <span class="progress-time" id="npe-remaining">-0:00</span>
        </div>
      </div>

      <div class="btn-group" style="justify-content:center;gap:8px;">
        <button class="tb-btn tb-btn--icon-only" id="npe-shuffle">
          <i data-lucide="shuffle" class="icon"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="npe-prev">
          <i data-lucide="skip-back" class="icon icon--lg"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="npe-playpause" style="width:64px;height:64px;border-radius:32px;background:var(--accent-blue);">
          <i data-lucide="pause" class="icon icon--lg"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="npe-next">
          <i data-lucide="skip-forward" class="icon icon--lg"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="npe-repeat">
          <i data-lucide="repeat" class="icon"></i>
        </button>
      </div>
    `;

    document.getElementById('touchbar').appendChild(expandedEl);

    // Wire up controls
    expandedEl.querySelector('#npe-playpause').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'play_pause' });
    });
    expandedEl.querySelector('#npe-prev').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'prev_track' });
    });
    expandedEl.querySelector('#npe-next').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'next_track' });
    });
    expandedEl.querySelector('#npe-shuffle').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'shuffle' });
    });
    expandedEl.querySelector('#npe-repeat').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'repeat' });
    });
    expandedEl.querySelector('#npe-like').addEventListener('click', () => {
      Haptics.like();
      isLiked = !isLiked;
      const btn = expandedEl.querySelector('#npe-like');
      btn.classList.toggle('like-btn--liked', isLiked);
      WS.send({ panel: 'spotify', action: 'like', value: isLiked });
    });

    // Swipe down to collapse
    let touchStartY = 0;
    expandedEl.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    expandedEl.addEventListener('touchend', (e) => {
      const delta = e.changedTouches[0].clientY - touchStartY;
      if (delta > 40) collapse(); // swipe down = collapse
    }, { passive: true });

    // Seek by tapping progress track
    expandedEl.querySelector('#npe-progress-track').addEventListener('click', (e) => {
      if (!currentTrack) return;
      const rect     = e.currentTarget.getBoundingClientRect();
      const ratio    = (e.clientX - rect.left) / rect.width;
      const seekMs   = Math.round(ratio * currentTrack.duration_ms);
      WS.send({ panel: 'spotify', action: 'seek', value: seekMs });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ── BUILD FULLSCREEN (Size 4) ────────────────────────────────
  function buildFullscreen() {
    if (fullscreenEl) fullscreenEl.remove();

    fullscreenEl = document.createElement('div');
    fullscreenEl.style.cssText = `
      position: absolute; inset: 0; z-index: 400;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; padding: 20px;
      background: var(--bg-base);
      transition: opacity 400ms ease;
      opacity: 0;
    `;

    const artUrl = currentTrack?.album_art || '';
    fullscreenEl.innerHTML = `
      <div style="
        position:absolute;inset:0;
        background-image:url('${artUrl}');
        background-size:cover;background-position:center;
        filter:blur(40px) brightness(0.35);
        transform:scale(1.1);
      "></div>
      <img src="${artUrl}" crossorigin="anonymous"
        style="width:140px;height:140px;border-radius:14px;
               box-shadow:0 8px 32px rgba(0,0,0,0.6);position:relative;z-index:1;"
      />
      <div style="text-align:center;position:relative;z-index:1;">
        <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;">
          ${currentTrack?.name || '-'}
        </div>
        <div style="font-size:14px;color:var(--text-secondary);">
          ${currentTrack?.artist || '-'}
        </div>
      </div>
      <div style="display:flex;gap:16px;position:relative;z-index:1;margin-top:8px;">
        <button class="tb-btn tb-btn--icon-only" id="fs-prev">
          <i data-lucide="skip-back" class="icon icon--lg"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="fs-playpause"
          style="width:64px;height:64px;border-radius:32px;background:var(--accent-blue);">
          <i data-lucide="${isPlaying ? 'pause' : 'play'}" class="icon icon--lg"></i>
        </button>
        <button class="tb-btn tb-btn--icon-only" id="fs-next">
          <i data-lucide="skip-forward" class="icon icon--lg"></i>
        </button>
      </div>
      <div style="position:relative;z-index:1;font-size:12px;color:var(--text-tertiary);margin-top:4px;">
        Swipe down to close
      </div>
    `;

    document.getElementById('touchbar').appendChild(fullscreenEl);
    requestAnimationFrame(() => fullscreenEl.style.opacity = '1');

    // Controls
    fullscreenEl.querySelector('#fs-playpause').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'play_pause' });
    });
    fullscreenEl.querySelector('#fs-prev').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'prev_track' });
    });
    fullscreenEl.querySelector('#fs-next').addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'spotify', action: 'next_track' });
    });

    // Swipe down to close
    let startY = 0;
    fullscreenEl.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    fullscreenEl.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 50) exitFullscreen();
    }, { passive: true });

    if (window.lucide) window.lucide.createIcons();
  }

  // ── SIZE TRANSITIONS ──────────────────────────────────────────

  function setSize1() {
    currentSize = 1;
    row3.classList.remove('np-size2');
    if (expandedEl) { expandedEl.classList.remove('visible'); }
    pill.style.maxWidth = '220px';
    pillTitle.classList.remove('pill__title--playing');
  }

  function setSize2() {
    currentSize = 2;
    row3.classList.add('np-size2');
    if (expandedEl) expandedEl.classList.remove('visible');
    pillTitle.classList.add('pill__title--playing');

    // Add volume and brightness buttons to Row 3 right side
    // so they're accessible even when Now Playing takes over
    const existing = document.getElementById('np-sys-controls');
    if (!existing) {
      const sysControls = document.createElement('div');
      sysControls.id = 'np-sys-controls';
      sysControls.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        margin-left: auto;
        padding-right: 8px;
      `;
      sysControls.innerHTML = `
        <button class="sys-btn" id="np-btn-volume">
          <i data-lucide="volume-2" class="icon"></i>
        </button>
        <button class="sys-btn" id="np-btn-brightness">
          <i data-lucide="sun" class="icon"></i>
        </button>
        <button class="sys-btn" id="np-btn-mute">
          <i data-lucide="volume-x" class="icon"></i>
        </button>
      `;
      row3.appendChild(sysControls);
      if (window.lucide) window.lucide.createIcons();

      // Wire up the buttons
      sysControls.querySelector('#np-btn-volume').addEventListener('click', () => {
        document.getElementById('btn-volume').click();
      });
      sysControls.querySelector('#np-btn-brightness').addEventListener('click', () => {
        document.getElementById('btn-brightness').click();
      });
      sysControls.querySelector('#np-btn-mute').addEventListener('click', () => {
        document.getElementById('btn-mute').click();
      });
    }

    // Pulse animation on new song
    anime({
      targets: pill,
      scale: [1, 1.04, 1],
      duration: 400,
      easing: 'easeInOutQuad',
    });
  }

  function setSize3() {
    currentSize = 3;
    buildExpanded();
    requestAnimationFrame(() => {
      expandedEl.classList.add('visible');
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function setSize4() {
    currentSize = 4;
    buildFullscreen();
  }

  function collapse() {
    if (currentSize === 3) {
      expandedEl.classList.remove('visible');
      setTimeout(() => currentSize = 2, 300);
    }
  }

  function exitFullscreen() {
    if (fullscreenEl) {
      fullscreenEl.style.opacity = '0';
      setTimeout(() => {
        fullscreenEl.remove();
        fullscreenEl = null;
      }, 400);
    }
    currentSize = 2;
  }

  // ── EXPAND ────────────────────────────────────────────────────
  // Called when pill is tapped
  function expand() {
    Haptics.tap();
    if (currentSize === 1) setSize2();
    else if (currentSize === 2) setSize3();
    else if (currentSize === 3) setSize4();
    else if (currentSize === 4) exitFullscreen();
  }

  // ── UPDATE PROGRESS BAR ───────────────────────────────────────
  function startProgressTimer() {
    clearInterval(progressTimer);
    if (!isPlaying || !currentTrack) return;

    progressTimer = setInterval(() => {
      progressMs += 1000;
      if (progressMs >= currentTrack.duration_ms) {
        clearInterval(progressTimer);
        return;
      }

      const pct = (progressMs / currentTrack.duration_ms) * 100;

      // Update expanded panel progress
      const fill     = document.getElementById('npe-progress-fill');
      const elapsed  = document.getElementById('npe-elapsed');
      const remaining= document.getElementById('npe-remaining');

      if (fill)      fill.style.width         = `${pct}%`;
      if (elapsed)   elapsed.textContent       = formatMs(progressMs);
      if (remaining) remaining.textContent     = `-${formatMs(currentTrack.duration_ms - progressMs)}`;

    }, 1000);
  }

  // ── UPDATE ────────────────────────────────────────────────────
  // Called from app.js when Spotify track data arrives from server
  function update(track) {
    if (!track) {
      // Nothing playing
      setSize1();
      pillTitle.textContent = 'Not Playing';
      pillArt.innerHTML     = '';
      ColorExtractor.resetTint();
      clearInterval(progressTimer);
      return;
    }

    const isNewSong = !currentTrack || currentTrack.id !== track.id;
    currentTrack    = track;
    isPlaying       = track.is_playing;
    progressMs      = track.progress_ms || 0;

    // ── Update pill ──────────────────────────────────────────
    pillTitle.textContent = track.name;
    pillTitle.classList.add('pill__title--playing');

    if (track.album_art) {
      pillArt.innerHTML = `<img src="${track.album_art}" crossorigin="anonymous" alt="" />`;
    }

    // ── Upgrade to size 2 if currently size 1 ───────────────
    if (currentSize === 1) setSize2();

    // ── New song — animate and update color ─────────────────
    if (isNewSong) {
      // Flip album art animation
      anime({
        targets: pillArt,
        rotateY: [0, 90, 0],
        duration: 400,
        easing: 'easeInOutQuad',
      });

      // Extract album art color and tint the UI
      if (track.album_art) {
        ColorExtractor.process(track.album_art);
      }
    }

    // ── Update expanded panel if open ───────────────────────
    if (currentSize === 3 && expandedEl) {
      const img     = expandedEl.querySelector('#npe-art-img');
      const title   = expandedEl.querySelector('#npe-title');
      const artist  = expandedEl.querySelector('#npe-artist');
      const album   = expandedEl.querySelector('#npe-album');
      const ppBtn   = expandedEl.querySelector('#npe-playpause');

      if (img)    img.src            = track.album_art || '';
      if (title)  title.textContent  = track.name || '-';
      if (artist) artist.textContent = track.artist || '-';
      if (album)  album.textContent  = track.album || '-';
      if (ppBtn) {
        ppBtn.innerHTML = isPlaying
          ? '<i data-lucide="pause" class="icon icon--lg"></i>'
          : '<i data-lucide="play" class="icon icon--lg"></i>';
        if (window.lucide) window.lucide.createIcons();
      }
    }

    // ── Start/stop progress timer ────────────────────────────
    if (isPlaying) startProgressTimer();
    else clearInterval(progressTimer);
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    // Long press pill = size 4 (concert mode)
    let longPressTimer;
    pill.addEventListener('touchstart', () => {
      longPressTimer = setTimeout(() => {
        Haptics.success();
        setSize4();
      }, 600);
    }, { passive: true });
    pill.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    });
  }

  return { init, update, expand };

})();

export { NowPlaying };