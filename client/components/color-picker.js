// ── COLOR PICKER ─────────────────────────────────────────────────
// Full color picker well — opens over Rows 1+2
// Hue slider + SB picker + hex input + recent colors

import { Haptics } from '../utils/haptics.js';
import { WS }      from '../utils/websocket.js';

const ColorPicker = (() => {

  let well      = null;
  let isOpen    = false;
  let hue       = 200;
  let sat       = 80;
  let bri       = 80;
  let recentColors = [];

  // ── BUILD WELL ────────────────────────────────────────────────
  function build() {
    if (well) well.remove();

    well = document.createElement('div');
    well.id = 'color-picker-well';
    well.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0;
      height: calc(var(--row-height) * 2 + 1px);
      background: var(--bg-well);
      border-bottom: 1px solid var(--separator);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 14px;
      z-index: 400;
      transform: translateY(-100%);
      opacity: 0;
      transition: transform 250ms var(--ease-apple), opacity 250ms ease;
    `;

    well.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex:1;">

        <!-- Color preview -->
        <div id="cp-preview" style="
          width:52px;height:52px;
          border-radius:10px;
          background:hsl(${hue},${sat}%,${bri}%);
          flex-shrink:0;
          border:2px solid rgba(255,255,255,0.1);
          cursor:pointer;
        "></div>

        <!-- Sliders -->
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">

          <!-- Hue -->
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;color:var(--text-secondary);width:20px;">H</span>
            <div class="cp-track" id="cp-hue-track" style="
              flex:1;height:14px;border-radius:7px;
              background:linear-gradient(to right,
                hsl(0,100%,50%),hsl(30,100%,50%),hsl(60,100%,50%),
                hsl(90,100%,50%),hsl(120,100%,50%),hsl(150,100%,50%),
                hsl(180,100%,50%),hsl(210,100%,50%),hsl(240,100%,50%),
                hsl(270,100%,50%),hsl(300,100%,50%),hsl(330,100%,50%),
                hsl(360,100%,50%));
              position:relative;touch-action:none;cursor:pointer;
            ">
              <div id="cp-hue-thumb" style="
                position:absolute;top:50%;
                width:20px;height:20px;
                background:#fff;border-radius:50%;
                transform:translate(-50%,-50%);
                box-shadow:0 2px 6px rgba(0,0,0,0.4);
                left:${(hue/360)*100}%;
                pointer-events:none;
              "></div>
            </div>
            <span id="cp-hue-val" style="font-size:11px;color:var(--text-secondary);width:30px;text-align:right;font-variant-numeric:tabular-nums;">${hue}°</span>
          </div>

          <!-- Saturation -->
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;color:var(--text-secondary);width:20px;">S</span>
            <div class="cp-track" id="cp-sat-track" style="
              flex:1;height:14px;border-radius:7px;
              background:linear-gradient(to right,hsl(${hue},0%,50%),hsl(${hue},100%,50%));
              position:relative;touch-action:none;cursor:pointer;
            ">
              <div id="cp-sat-thumb" style="
                position:absolute;top:50%;
                width:20px;height:20px;
                background:#fff;border-radius:50%;
                transform:translate(-50%,-50%);
                box-shadow:0 2px 6px rgba(0,0,0,0.4);
                left:${sat}%;
                pointer-events:none;
              "></div>
            </div>
            <span id="cp-sat-val" style="font-size:11px;color:var(--text-secondary);width:30px;text-align:right;font-variant-numeric:tabular-nums;">${sat}%</span>
          </div>

          <!-- Brightness -->
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;color:var(--text-secondary);width:20px;">B</span>
            <div class="cp-track" id="cp-bri-track" style="
              flex:1;height:14px;border-radius:7px;
              background:linear-gradient(to right,#000,hsl(${hue},${sat}%,50%),#fff);
              position:relative;touch-action:none;cursor:pointer;
            ">
              <div id="cp-bri-thumb" style="
                position:absolute;top:50%;
                width:20px;height:20px;
                background:#fff;border-radius:50%;
                transform:translate(-50%,-50%);
                box-shadow:0 2px 6px rgba(0,0,0,0.4);
                left:${bri}%;
                pointer-events:none;
              "></div>
            </div>
            <span id="cp-bri-val" style="font-size:11px;color:var(--text-secondary);width:30px;text-align:right;font-variant-numeric:tabular-nums;">${bri}%</span>
          </div>

        </div>

        <!-- Hex + copy -->
        <div style="display:flex;flex-direction:column;gap:6px;align-items:center;flex-shrink:0;">
          <div id="cp-hex" style="
            font-size:11px;font-family:'Courier New',monospace;
            color:var(--text-primary);
            background:var(--bg-button);
            padding:4px 8px;border-radius:6px;
            cursor:pointer;
          ">#4A9EFF</div>
          <button id="cp-copy-btn" style="
            font-size:11px;
            background:var(--accent-blue);
            color:#fff;padding:4px 10px;
            border-radius:6px;
            font-weight:600;
          ">Copy</button>
          <button id="cp-close-btn" style="
            font-size:11px;color:var(--text-secondary);
          ">Close</button>
        </div>
      </div>

      <!-- Recent colors -->
      <div id="cp-recents" style="
        display:flex;align-items:center;gap:6px;
        overflow-x:auto;scrollbar-width:none;
      "></div>
    `;

    document.getElementById('touchbar').appendChild(well);
    wireSliders();
    updatePreview();
    renderRecents();

    document.getElementById('cp-copy-btn').addEventListener('click', copyColor);
    document.getElementById('cp-close-btn').addEventListener('click', close);
  }

  // ── WIRE SLIDERS ──────────────────────────────────────────────
  function wireSliders() {
    wireTrack('cp-hue-track', 'cp-hue-thumb', 'cp-hue-val',
      val => { hue = Math.round(val * 360); return `${hue}°`; });
    wireTrack('cp-sat-track', 'cp-sat-thumb', 'cp-sat-val',
      val => { sat = Math.round(val * 100); return `${sat}%`; });
    wireTrack('cp-bri-track', 'cp-bri-thumb', 'cp-bri-val',
      val => { bri = Math.round(val * 100); return `${bri}%`; });
  }

  function wireTrack(trackId, thumbId, valId, onChange) {
    const track = document.getElementById(trackId);
    const thumb = document.getElementById(thumbId);
    const label = document.getElementById(valId);

    function update(clientX) {
      const rect  = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const pct   = `${ratio * 100}%`;
      thumb.style.left = pct;
      label.textContent = onChange(ratio);
      updatePreview();
      Haptics.tick();
    }

    track.addEventListener('touchstart', e => {
      update(e.touches[0].clientX);
      e.preventDefault();
    }, { passive: false });

    track.addEventListener('touchmove', e => {
      update(e.touches[0].clientX);
      e.preventDefault();
    }, { passive: false });

    track.addEventListener('click', e => update(e.clientX));
  }

  // ── UPDATE PREVIEW ────────────────────────────────────────────
  function updatePreview() {
    const hex = hslToHex(hue, sat, bri);
    const preview = document.getElementById('cp-preview');
    const hexEl   = document.getElementById('cp-hex');
    if (preview) preview.style.background = `hsl(${hue},${sat}%,${bri}%)`;
    if (hexEl)   hexEl.textContent = hex;

    // Update sat track gradient
    const satTrack = document.getElementById('cp-sat-track');
    if (satTrack) satTrack.style.background =
      `linear-gradient(to right,hsl(${hue},0%,50%),hsl(${hue},100%,50%))`;

    // Update bri track gradient
    const briTrack = document.getElementById('cp-bri-track');
    if (briTrack) briTrack.style.background =
      `linear-gradient(to right,#000,hsl(${hue},${sat}%,50%),#fff)`;
  }

  // ── COPY COLOR ────────────────────────────────────────────────
  function copyColor() {
    Haptics.success();
    const hex = hslToHex(hue, sat, bri);

    // Add to recents
    recentColors = [hex, ...recentColors.filter(c => c !== hex)].slice(0, 10);
    try { localStorage.setItem('tb_recent_colors', JSON.stringify(recentColors)); } catch {}

    // Copy to clipboard and paste into active app
    WS.send({ panel: 'system', action: 'copy_color', value: hex });

    // Flash copy button
    const btn = document.getElementById('cp-copy-btn');
    if (btn) {
      btn.textContent = '✓ Copied';
      btn.style.background = 'var(--accent-green)';
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.style.background = 'var(--accent-blue)';
      }, 1000);
    }
  }

  // ── RENDER RECENTS ────────────────────────────────────────────
  function renderRecents() {
    try {
      recentColors = JSON.parse(localStorage.getItem('tb_recent_colors') || '[]');
    } catch { recentColors = []; }

    const container = document.getElementById('cp-recents');
    if (!container) return;
    container.innerHTML = '';

    recentColors.forEach(hex => {
      const swatch = document.createElement('button');
      swatch.style.cssText = `
        width:28px;height:28px;border-radius:6px;
        background:${hex};flex-shrink:0;
        border:2px solid rgba(255,255,255,0.15);
      `;
      swatch.addEventListener('click', () => {
        Haptics.tap();
        WS.send({ panel: 'system', action: 'copy_color', value: hex });
      });
      container.appendChild(swatch);
    });
  }

  // ── HSL TO HEX ────────────────────────────────────────────────
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }

  // ── OPEN / CLOSE / TOGGLE ─────────────────────────────────────
  function open() {
    isOpen = true;
    build();
    requestAnimationFrame(() => {
      well.style.transform = 'translateY(0)';
      well.style.opacity   = '1';
    });
  }

  function close() {
    isOpen = false;
    if (well) {
      well.style.transform = 'translateY(-100%)';
      well.style.opacity   = '0';
      setTimeout(() => { if (well) { well.remove(); well = null; } }, 300);
    }
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  return { open, close, toggle };

})();

export { ColorPicker };