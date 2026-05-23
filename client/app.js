// ── IMPORTS ────────────────────────────────────────────────────
import { WS }             from './utils/websocket.js';
import { Haptics }        from './utils/haptics.js';
import { EmojiPanel }     from './components/emoji-panel.js';
import { SliderWell }     from './components/slider.js';
import { WordSuggestions }from './components/word-suggestions.js';
import { NowPlaying }     from './components/now-playing.js';
import { ColorPicker } from './components/color-picker.js';

// Panels
import { SpotifyPanel }   from './panels/spotify.js';
import { ChromePanel }    from './panels/chrome.js';
import { WordPanel }      from './panels/word.js';
import { ExcelPanel }     from './panels/excel.js';
import { PowerPointPanel }from './panels/powerpoint.js';
import { VSCodePanel }    from './panels/vscode.js';
import { DefaultPanel }   from './panels/default.js';

// ── APP STATE ───────────────────────────────────────────────────
// One single object holds all state — simple and easy to debug
const AppState = {
  activeApp:        'default',
  isConnected:      false,
  volume:           50,
  brightness:       50,
  isMuted:          false,
  nowPlaying:       null,
  activePanel:      null,
  openApps:         [],   // live list of open Windows apps from server
  lastTabs:         null, // most-recently-received tab data for Chrome panel
  manualSwitchTime: 0,    // timestamp of last manual panel switch — suppresses auto-detection
};

// Expose for DevTools debugging: window.AppState.openApps, etc.
window.AppState = AppState;

// ── PANEL MAP ───────────────────────────────────────────────────
// Maps app name (sent from Python) to its panel class
const PANEL_MAP = {
  spotify:     SpotifyPanel,
  chrome:      ChromePanel,
  youtube:     ChromePanel,
  word:        WordPanel,
  excel:       ExcelPanel,
  powerpoint:  PowerPointPanel,
  canva:       PowerPointPanel,
  vscode:      VSCodePanel,
  default:     DefaultPanel,
};

// ── DOM REFS ────────────────────────────────────────────────────
const DOM = {
  row1Center:  document.getElementById('row1-center'),
  row1Left:    document.getElementById('row1-left'),
  row2Center:  document.getElementById('row2-center'),
  row2Left:    document.getElementById('row2-left'),
  row3:        document.getElementById('row3'),
  appIcon:     document.getElementById('app-icon'),
  clock:       document.getElementById('clock'),
  statusDot:   document.getElementById('connection-status'),
  ambientClock:document.getElementById('ambient-clock'),
  ambientDate: document.getElementById('ambient-date'),
  ambient:     document.getElementById('ambient-overlay'),
  btnVolume:   document.getElementById('btn-volume'),
  btnBrightness:document.getElementById('btn-brightness'),
  btnMute:     document.getElementById('btn-mute'),
  btnEmoji:    document.getElementById('btn-emoji'),
};

// ── APP ICONS ───────────────────────────────────────────────────
// Maps app name to a lucide icon name
const APP_ICONS = {
  spotify:    'music',
  chrome:     'globe',
  youtube:    'youtube',
  word:       'file-text',
  excel:      'table',
  powerpoint: 'presentation',
  canva:      'layers',
  vscode:     'code-2',
  default:    'layout-grid',
};

// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLucide();
  initClock();
  initWakeLock();
  initWebSocket();
  initSystemButtons();
  initAmbientMode();
  loadPanel('default');
  WordSuggestions.init(DOM.row1Center);
  NowPlaying.init();
});

// ── LUCIDE ICONS ────────────────────────────────────────────────
// Replaces all <i data-lucide="x"> elements with actual SVG icons
function initLucide() {
  if (window.lucide) window.lucide.createIcons();
}

// ── CLOCK ────────────────────────────────────────────────────────
function initClock() {
  function tick() {
    const now  = new Date();
    const h    = now.getHours().toString().padStart(2, '0');
    const m    = now.getMinutes().toString().padStart(2, '0');
    const time = `${h}:${m}`;

    DOM.clock.textContent = time;

    // Ambient clock
    DOM.ambientClock.textContent = time;
    DOM.ambientDate.textContent  = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }
  tick();
  setInterval(tick, 10000); // update every 10s
}

// ── WAKE LOCK ────────────────────────────────────────────────────
// Prevents the phone screen from sleeping while Touch Bar is open
async function initWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      await navigator.wakeLock.request('screen');
    }
  } catch (e) {
    console.log('Wake lock not available:', e.message);
  }
}

// ── WEBSOCKET ────────────────────────────────────────────────────
function initWebSocket() {
  WS.init({
    onConnect: () => {
      AppState.isConnected = true;
      setStatusDot('connected');
    },
    onDisconnect: () => {
      AppState.isConnected = false;
      setStatusDot('disconnected');
    },
    onConnecting: () => {
      setStatusDot('connecting');
    },
    onMessage: handleServerMessage,
  });
}

// ── STATUS DOT ───────────────────────────────────────────────────
function setStatusDot(state) {
  DOM.statusDot.className = `status-dot status-dot--${state}`;
}

// ── HANDLE SERVER MESSAGES ───────────────────────────────────────
// This is the router — every message from the laptop comes here
function handleServerMessage(data) {
  switch (data.event) {

    case 'typing':
      WordSuggestions.update(data.word);
      break;

    case 'app_change':
      console.log('[app_change] received:', data.app);
      // Ignore auto-detection for 3s after a manual switch from the app switcher
      if (Date.now() - AppState.manualSwitchTime < 3000) break;
      switchApp(data.app);
      break;

    case 'now_playing':
      // Spotify track data arrived — update Now Playing
      AppState.nowPlaying = data.track;
      NowPlaying.update(data.track);
      break;

    case 'volume':
      // Volume changed on laptop — update our slider state
      AppState.volume = data.value;
      SliderWell.syncValue('volume', data.value);
      break;

    case 'brightness':
      AppState.brightness = data.value;
      SliderWell.syncValue('brightness', data.value);
      break;

    case 'open_apps':
      AppState.openApps = data.apps || [];
      console.log('open_apps received:', JSON.stringify(data.apps));
      break;

    case 'tabs':
      AppState.lastTabs = data.tabs;
      if (AppState.activePanel && typeof AppState.activePanel.updateTabs === 'function') {
        AppState.activePanel.updateTabs(data.tabs);
      }
      break;

    case 'slides':
      // PowerPoint sent slide thumbnails
      if (AppState.activeApp === 'powerpoint' || AppState.activeApp === 'canva') {
        PowerPointPanel.updateSlides(data.slides, data.current);
      }
      break;

    case 'notification':
      showToast(data);
      break;

    case 'vscode_status':
      if (AppState.activeApp === 'vscode') {
        VSCodePanel.updateStatus(data);
      }
      break;
  }
}

// ── SWITCH APP ───────────────────────────────────────────────────
// Called when laptop detects a new foreground app
function switchApp(appName, force = false) {
  console.log(`[switchApp] app=${appName} active=${AppState.activeApp} force=${force}`);
  if (appName === AppState.activeApp && !force) return;
  if (force) AppState.manualSwitchTime = Date.now();

  AppState.activeApp = appName;

  // Update the app icon badge in Row 2 left
  const iconName = APP_ICONS[appName] || APP_ICONS.default;
  DOM.appIcon.innerHTML = `<i data-lucide="${iconName}" class="icon"></i>`;
  initLucide();

  // Load the new panel
  loadPanel(appName);
}

// ── LOAD PANEL ───────────────────────────────────────────────────
// Swaps Row 1 and Row 2 content for the given app
function loadPanel(appName) {
  const PanelClass = PANEL_MAP[appName] || DefaultPanel;

  DOM.row2Center.style.opacity = '0';
  DOM.row1Center.style.opacity = '0';

  setTimeout(() => {
    DOM.row2Center.innerHTML = '';
    DOM.row1Center.innerHTML = '';

    AppState.activePanel = new PanelClass({
      row1: DOM.row1Center,
      row2: DOM.row2Center,
      send: (action) => WS.send({ panel: appName, ...action }),
    });

    AppState.activePanel.mount();

    // Sync cached state into panels that need it immediately on mount
    if (appName === 'spotify' && AppState.nowPlaying) {
      NowPlaying.update(AppState.nowPlaying);
      const lyric = document.getElementById('spotify-lyric');
      if (lyric) lyric.textContent = AppState.nowPlaying.name || '♪ Now Playing';
    }
    // Push last-received tabs into Chrome panel before the "Loading tabs..." flash
    if (AppState.lastTabs && typeof AppState.activePanel.updateTabs === 'function') {
      AppState.activePanel.updateTabs(AppState.lastTabs);
    }

    // Always show word suggestions in Row 1
    // unless the panel has its own Row 1 content
    if (!DOM.row1Center.hasChildNodes()) {
      WordSuggestions.init(DOM.row1Center);
    }

    DOM.row2Center.classList.add('panel-enter');
    DOM.row1Center.classList.add('panel-enter');

    DOM.row2Center.style.opacity = '1';
    DOM.row1Center.style.opacity = '1';

    initLucide();

    setTimeout(() => {
      DOM.row2Center.classList.remove('panel-enter');
      DOM.row1Center.classList.remove('panel-enter');
    }, 200);

  }, 100);
}

function showAppSwitcher() {
  // Remove existing switcher
  const existing = document.getElementById('app-switcher');
  if (existing) { existing.remove(); return; }

  // Use live open-app list from server; fall back to just Home if not yet received
  const apps = AppState.openApps.length > 0
    ? AppState.openApps
    : [{ name: 'default', label: 'Home' }];

  const switcher = document.createElement('div');
  switcher.id = 'app-switcher';
  switcher.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 96px;
    background: var(--bg-well);
    border-bottom: 1px solid var(--separator);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    z-index: 400;
    animation: panelFadeIn 150ms var(--ease-apple) forwards;
    overflow-x: auto;
  `;

  // Build buttons with data attributes — NO event listeners yet.
  // Listeners are attached after 200ms so the long-press touchend that
  // opened the switcher can't accidentally fire a button immediately.
  apps.forEach(app => {
    const btn = document.createElement('button');
    btn.className = `tb-btn tb-btn--icon-only${AppState.activeApp === app.name ? ' tb-btn--active' : ''}`;
    btn.style.cssText = 'flex-direction:column;gap:4px;height:72px;min-width:64px;font-size:10px;';
    btn.dataset.app   = app.name;
    btn.dataset.label = app.label;
    const iconName = APP_ICONS[app.name] || 'layout-grid';
    btn.innerHTML = `
      <i data-lucide="${iconName}" class="icon"></i>
      <span>${app.label}</span>
    `;
    switcher.appendChild(btn);
  });

  // Tap outside to close — only remove if the touch target is outside the switcher
  setTimeout(() => {
    document.addEventListener('touchstart', (e) => {
      if (!switcher.contains(e.target)) switcher.remove();
    }, { once: true, passive: true });
  }, 100);

  document.getElementById('touchbar').appendChild(switcher);
  initLucide();

  // Attach touchend listeners after 200ms — long-press touchend has resolved by then
  setTimeout(() => {
    switcher.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const appName = btn.dataset.app;
        console.log('[switcher] tapped:', appName);
        Haptics.tap();
        switchApp(appName, true);
        setTimeout(() => switcher.remove(), 150);
      });
    });
  }, 200);
}

// ── SYSTEM BUTTONS ───────────────────────────────────────────────
function initSystemButtons() {

  // App icon — tap = Home (reload default panel), long press = app switcher
  let appIconLongPressTimer;
  let appIconSuppressClick = false;
  DOM.appIcon.addEventListener('touchstart', () => {
    appIconSuppressClick = false;
    appIconLongPressTimer = setTimeout(() => {
      appIconSuppressClick = true;
      Haptics.success();
      showAppSwitcher();
    }, 600);
  }, { passive: true });
  DOM.appIcon.addEventListener('touchend',  () => clearTimeout(appIconLongPressTimer), { passive: true });
  DOM.appIcon.addEventListener('touchmove', () => clearTimeout(appIconLongPressTimer), { passive: true });
  DOM.appIcon.addEventListener('click', () => {
    if (appIconSuppressClick) { appIconSuppressClick = false; return; }
    Haptics.tap();
    switchApp('default', true);
  });

  // Volume — tap opens slider well
  DOM.btnVolume.addEventListener('click', () => {
    Haptics.tap();
    SliderWell.open('volume', AppState.volume, (val) => {
      AppState.volume = val;
      WS.send({ panel: 'system', action: 'volume', value: val });
    });
  });

  // Brightness — tap opens slider well
  DOM.btnBrightness.addEventListener('click', () => {
    Haptics.tap();
    SliderWell.open('brightness', AppState.brightness, (val) => {
      AppState.brightness = val;
      WS.send({ panel: 'system', action: 'brightness', value: val });
    });
  });

  // Mute toggle
  DOM.btnMute.addEventListener('click', () => {
    Haptics.tap();
    AppState.isMuted = !AppState.isMuted;
    DOM.btnMute.classList.toggle('sys-btn--muted', AppState.isMuted);
    WS.send({ panel: 'system', action: 'mute' });
  });

  // Emoji panel
  DOM.btnEmoji.addEventListener('click', () => {
    Haptics.tap();
    EmojiPanel.toggle((emoji) => {
      // User picked an emoji — send to laptop to paste
      WS.send({ panel: 'emoji', action: 'insert', value: emoji });
    });
  });

  // Screenshot — any button with data-action="screenshot"
  document.querySelectorAll('[data-action="screenshot"]').forEach(btn => {
    btn.addEventListener('click', () => {
      Haptics.tap();
      WS.send({ panel: 'system', action: 'screenshot' });
    });
  });

  // Pill play/pause and next buttons
  document.querySelectorAll('.pill__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // don't trigger pill expand
      Haptics.tap();
      WS.send({ panel: 'spotify', action: btn.dataset.action });
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="color_picker"]');
    if (btn) {
      Haptics.tap();
      ColorPicker.toggle();
    }
  });
}

// ── AMBIENT MODE ─────────────────────────────────────────────────
// Shows clock after 5 minutes of no touch
function initAmbientMode() {
  let timer;

  function resetTimer() {
    clearTimeout(timer);
    DOM.ambient.classList.remove('visible');
    timer = setTimeout(() => {
      DOM.ambient.classList.add('visible');
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Any touch resets the timer
  document.addEventListener('touchstart', resetTimer, { passive: true });
  document.addEventListener('click', resetTimer);

  // Tap ambient to wake
  DOM.ambient.addEventListener('click', () => {
    DOM.ambient.classList.remove('visible');
    resetTimer();
  });

  resetTimer();
}

// ── NOTIFICATION TOAST ───────────────────────────────────────────
let toastTimer;
function showToast(data) {
  // Remove existing toast if any
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast__icon">${data.icon || '🔔'}</div>
    <div class="toast__body">
      <div class="toast__app">${data.app || ''}</div>
      <div class="toast__title">${data.title || ''}</div>
    </div>
  `;

  document.getElementById('touchbar').appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('visible'));

  // Tap to dismiss + focus app
  toast.addEventListener('click', () => {
    WS.send({ panel: 'system', action: 'focus_app', app: data.app });
    dismissToast(toast);
  });

  // Auto dismiss after 3 seconds
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dismissToast(toast), 3000);
}

function dismissToast(toast) {
  toast.classList.remove('visible');
  setTimeout(() => toast.remove(), 350);
}

// ── EXPORT APP STATE ─────────────────────────────────────────────
// Other modules can read app state if needed
export { AppState };