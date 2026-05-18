// ── SLIDER WELL ─────────────────────────────────────────────────
// Handles volume and brightness slider wells.
// Slides up over Row 3 on tap, collapses after 3s idle.

import { Haptics } from '../utils/haptics.js';

const SliderWell = (() => {

  // ── DOM REFS ──────────────────────────────────────────────────
  const well       = document.getElementById('slider-well');
  const iconEl     = document.getElementById('slider-icon');
  const track      = document.getElementById('slider-track');
  const fill       = document.getElementById('slider-fill');
  const thumb      = document.getElementById('slider-thumb');
  const valueLabel = document.getElementById('slider-value');
  const closeBtn   = document.getElementById('slider-close');

  // ── STATE ─────────────────────────────────────────────────────
  let currentControl = null; // 'volume' or 'brightness'
  let currentValue   = 50;
  let onChangeCb     = null; // callback to app.js when value changes
  let autoCloseTimer = null;
  let isDragging     = false;
  let lastTickValue  = -1;   // for haptic ticks every 5%

  // Icons for each control type
  const ICONS = {
    volume:     'volume-2',
    brightness: 'sun',
  };

  // ── OPEN ──────────────────────────────────────────────────────
  // Called from app.js when volume or brightness button is tapped
  function open(control, initialValue, onChange) {
    currentControl = control;
    currentValue   = initialValue;
    onChangeCb     = onChange;

    // Swap icon to match control type
    iconEl.innerHTML = `<i data-lucide="${ICONS[control]}" class="icon"></i>`;
    if (window.lucide) window.lucide.createIcons();

    // Set initial slider position
    updateUI(currentValue);

    // Show the well
    well.classList.remove('hidden');
    well.classList.add('visible');

    // Start auto-close timer
    resetAutoClose();
  }

  // ── CLOSE ─────────────────────────────────────────────────────
  function close() {
    well.classList.remove('visible');
    well.classList.add('hidden');
    clearTimeout(autoCloseTimer);
    currentControl = null;
  }

  // ── UPDATE UI ─────────────────────────────────────────────────
  // Moves the fill bar and thumb to reflect current value
  function updateUI(value) {
    const pct = `${value}%`;
    fill.style.width  = pct;
    thumb.style.left  = pct;
    valueLabel.textContent = pct;
  }

  // ── AUTO CLOSE ────────────────────────────────────────────────
  function resetAutoClose() {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(close, 3000);
  }

  // ── SYNC VALUE ────────────────────────────────────────────────
  // Called from app.js when the laptop confirms the new value
  // Keeps UI in sync if there's any discrepancy
  function syncValue(control, value) {
    if (currentControl === control) {
      currentValue = value;
      updateUI(value);
    }
  }

  // ── CALCULATE VALUE FROM TOUCH ────────────────────────────────
  // Converts finger X position on track → 0–100 value
  function valueFromTouch(touchX) {
    const rect  = track.getBoundingClientRect();
    const ratio = (touchX - rect.left) / rect.width;
    // Clamp between 0 and 100
    return Math.round(Math.min(100, Math.max(0, ratio * 100)));
  }

  // ── TOUCH HANDLERS ────────────────────────────────────────────
  function onTouchStart(e) {
    isDragging = true;
    resetAutoClose();
    const touch = e.touches[0];
    const val   = valueFromTouch(touch.clientX);
    setVal(val);
    e.preventDefault();
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    resetAutoClose();
    const touch = e.touches[0];
    const val   = valueFromTouch(touch.clientX);
    setVal(val);
    e.preventDefault();
  }

  function onTouchEnd() {
    isDragging = false;
    // Send final value to laptop
    if (onChangeCb) onChangeCb(currentValue);
    resetAutoClose();
  }

  // ── SET VALUE ─────────────────────────────────────────────────
  // Updates value, UI, and haptic tick
  function setVal(val) {
    currentValue = val;
    updateUI(val);

    // Haptic tick every 5% — feels like physical detents
    const tickVal = Math.round(val / 5) * 5;
    if (tickVal !== lastTickValue) {
      Haptics.tick();
      lastTickValue = tickVal;
    }

    // Send to laptop in real time while dragging
    // Throttled — only send every 50ms to avoid flooding
    if (!setVal._throttle) {
      setVal._throttle = setTimeout(() => {
        if (onChangeCb) onChangeCb(currentValue);
        setVal._throttle = null;
      }, 50);
    }
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    // Close button
    closeBtn.addEventListener('click', () => {
      Haptics.tap();
      close();
    });

    // Touch events on the track
    track.addEventListener('touchstart', onTouchStart, { passive: false });
    track.addEventListener('touchmove',  onTouchMove,  { passive: false });
    track.addEventListener('touchend',   onTouchEnd);

    // Also handle click for desktop testing in Chrome DevTools
    track.addEventListener('click', (e) => {
      const val = valueFromTouch(e.clientX);
      setVal(val);
      if (onChangeCb) onChangeCb(val);
    });

    // Tapping anywhere on the well resets auto-close
    well.addEventListener('touchstart', resetAutoClose, { passive: true });
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { open, close, syncValue };

})();

export { SliderWell };