// ── EMOJI PANEL ─────────────────────────────────────────────────
// Slides up over Rows 2+3 when emoji button is tapped.
// Has category tabs, scrollable grid, recently used row.

import { Haptics } from '../utils/haptics.js';

const EmojiPanel = (() => {

  // ── DOM REFS ──────────────────────────────────────────────────
  const well       = document.getElementById('emoji-well');
  const catBar     = document.getElementById('emoji-categories');
  const grid       = document.getElementById('emoji-grid');

  // ── STATE ─────────────────────────────────────────────────────
  let isOpen      = false;
  let onPickCb    = null;
  let activeCategory = 'recent';

  // ── EMOJI DATA ────────────────────────────────────────────────
  const CATEGORIES = [
    {
      id: 'recent',
      icon: '🕐',
      emoji: [], // filled from localStorage
    },
    {
      id: 'smileys',
      icon: '😊',
      emoji: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
              '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
              '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸',
              '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️',
              '😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡'],
    },
    {
      id: 'gestures',
      icon: '👋',
      emoji: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞',
              '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
              '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
              '🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂'],
    },
    {
      id: 'hearts',
      icon: '❤️',
      emoji: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
              '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
              '✝️','☪️','🕉','✡️','🔯','🪯','☯️','✨','💫','⭐',
              '🌟','💥','🔥','🌈','☀️','🌤','⛅','🌥','☁️','🌦'],
    },
    {
      id: 'animals',
      icon: '🐱',
      emoji: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
              '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
              '🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄',
              '🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂'],
    },
    {
      id: 'food',
      icon: '🍕',
      emoji: ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧇',
              '🥞','🧈','🍞','🥐','🥖','🥨','🧀','🥗','🥙','🌮',
              '🌯','🫔','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟',
              '🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🍡','🍧'],
    },
    {
      id: 'activities',
      icon: '🎮',
      emoji: ['🎮','🕹','🎲','🎯','🎳','🎰','🎪','🎭','🎨','🖼',
              '🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸',
              '🪕','🎻','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗',
              '🎟','🎫','🎠','🎡','🎢','🎪','🤹','🎭','🎬','🎥'],
    },
    {
      id: 'travel',
      icon: '✈️',
      emoji: ['✈️','🚀','🛸','🚁','🛺','🚂','🚃','🚄','🚅','🚆',
              '🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎',
              '🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍',
              '🛵','🚲','🛴','🛹','🛼','🚏','🛣','🛤','⛽','🚧'],
    },
  ];

  // ── RECENTLY USED ─────────────────────────────────────────────
  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem('tb_recent_emoji') || '[]');
    } catch { return []; }
  }

  function addRecent(emoji) {
    let recent = getRecent();
    // Remove if already exists, add to front
    recent = [emoji, ...recent.filter(e => e !== emoji)];
    // Keep only last 20
    recent = recent.slice(0, 20);
    localStorage.setItem('tb_recent_emoji', JSON.stringify(recent));
  }

  // ── BUILD CATEGORY TABS ───────────────────────────────────────
  function buildCategoryTabs() {
    catBar.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'emoji-cat-btn';
      btn.textContent = cat.icon;
      btn.dataset.id = cat.id;
      if (cat.id === activeCategory) btn.classList.add('emoji-cat-btn--active');

      btn.addEventListener('click', () => {
        Haptics.tap();
        activeCategory = cat.id;
        // Update active tab
        catBar.querySelectorAll('.emoji-cat-btn').forEach(b =>
          b.classList.remove('emoji-cat-btn--active')
        );
        btn.classList.add('emoji-cat-btn--active');
        buildGrid(cat.id);
      });

      catBar.appendChild(btn);
    });
  }

  // ── BUILD EMOJI GRID ──────────────────────────────────────────
  function buildGrid(categoryId) {
    grid.innerHTML = '';

    let emojiList = [];

    if (categoryId === 'recent') {
      emojiList = getRecent();
      if (emojiList.length === 0) {
        // Show placeholder if no recent
        const msg = document.createElement('div');
        msg.style.cssText = 'color:#48484a;font-size:12px;padding:16px;width:100%;text-align:center;';
        msg.textContent = 'Tap an emoji to add to recents';
        grid.appendChild(msg);
        return;
      }
    } else {
      const cat = CATEGORIES.find(c => c.id === categoryId);
      emojiList = cat ? cat.emoji : [];
    }

    emojiList.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-btn';
      btn.textContent = emoji;

      btn.addEventListener('click', () => {
        Haptics.tap();
        addRecent(emoji);
        if (onPickCb) onPickCb(emoji);
        // Flash the button
        btn.style.background = 'var(--bg-button)';
        setTimeout(() => btn.style.background = '', 150);
        close();
      });

      grid.appendChild(btn);
    });
  }

  // ── OPEN ──────────────────────────────────────────────────────
  function open(onPick) {
    onPickCb = onPick;
    isOpen   = true;

    // Refresh recent emoji each time
    CATEGORIES[0].emoji = getRecent();

    buildCategoryTabs();
    buildGrid(activeCategory);

    well.classList.remove('hidden');
    well.classList.add('visible');
  }

  // ── CLOSE ─────────────────────────────────────────────────────
  function close() {
    isOpen = false;
    well.classList.remove('visible');
    well.classList.add('hidden');
  }

  // ── TOGGLE ────────────────────────────────────────────────────
  function toggle(onPick) {
    if (isOpen) close();
    else open(onPick);
  }

  // ── CLOSE ON OUTSIDE TAP ──────────────────────────────────────
  document.addEventListener('touchstart', (e) => {
    if (isOpen && !well.contains(e.target)) {
      const emojiBtn = document.getElementById('btn-emoji');
      if (!emojiBtn.contains(e.target)) close();
    }
  }, { passive: true });

  return { open, close, toggle };

})();

export { EmojiPanel };