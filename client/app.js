// ── IMPORTS ────────────────────────────────────────────────────
import { WS }             from './utils/websocket.js';
import { Haptics }        from './utils/haptics.js';
import { EmojiPanel }     from './components/emoji-panel.js';
import { SliderWell }     from './components/slider.js';
import { WordSuggestions }from './components/word-suggestions.js';
import { NowPlaying }     from './components/now-playing.js';

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
  activeApp:    'default',
  isConnected:  false,
  volume:       50,
  brightness:   50,
  isMuted:      false,
  nowPlaying:   null,
  activePanel:  null,
};

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

    case 'app_change':
      // Laptop detected a new active app — swap the panel
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

    case 'tabs':
      // Chrome sent tab list — pass to chrome panel
      if (AppState.activeApp === 'chrome' || AppState.activeApp === 'youtube') {
        ChromePanel.updateTabs(data.tabs);
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
function switchApp(appName) {
  if (appName === AppState.activeApp) return; // no change

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

  // Fade out current content
  DOM.row2Center.style.opacity = '0';
  DOM.row1Center.style.opacity = '0';

  setTimeout(() => {
    // Clear both rows
    DOM.row2Center.innerHTML = '';
    DOM.row1Center.innerHTML = '';

    // Mount new panel
    AppState.activePanel = new PanelClass({
      row1: DOM.row1Center,
      row2: DOM.row2Center,
      send: (action) => WS.send({ panel: appName, ...action }),
    });

    AppState.activePanel.mount();

    // Add entrance animation
    DOM.row2Center.classList.add('panel-enter');
    DOM.row1Center.classList.add('panel-enter');

    // Fade back in
    DOM.row2Center.style.opacity = '1';
    DOM.row1Center.style.opacity = '1';

    // Re-init Lucide for new icons
    initLucide();

    // Remove animation class after it completes
    setTimeout(() => {
      DOM.row2Center.classList.remove('panel-enter');
      DOM.row1Center.classList.remove('panel-enter');
    }, 200);

  }, 100);
}

// ── SYSTEM BUTTONS ───────────────────────────────────────────────
function initSystemButtons() {

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

  // Now playing pill — tap to expand
  document.getElementById('now-playing-pill').addEventListener('click', () => {
    NowPlaying.expand();
  });

  // Pill play/pause and next buttons
  document.querySelectorAll('.pill__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // don't trigger pill expand
      Haptics.tap();
      WS.send({ panel: 'spotify', action: btn.dataset.action });
    });
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