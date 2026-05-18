// ── COLOR EXTRACTOR ─────────────────────────────────────────────
// Extracts the dominant color from album art using the Canvas API.
// Applies it as --dynamic-tint CSS variable on the root element.
// This makes the entire Touch Bar tint to match the current song.

const ColorExtractor = (() => {

  // Hidden canvas — never shown on screen, just for pixel reading
  const canvas  = document.createElement('canvas');
  const ctx     = canvas.getContext('2d');
  canvas.width  = 1;
  canvas.height = 1;

  // How fast the tint transitions between songs (ms)
  const TRANSITION_DURATION = 600;

  // ── EXTRACT ───────────────────────────────────────────────────
  // Main function — takes an image URL, returns dominant RGB color
  function extract(imageUrl) {
    return new Promise((resolve, reject) => {
      const img   = new Image();
      img.crossOrigin = 'anonymous'; // needed for Spotify CDN images

      img.onload = () => {
        // Draw the entire image scaled down to 1×1 pixel
        // That single pixel = average/dominant color of whole image
        ctx.drawImage(img, 0, 0, 1, 1);

        // Read the pixel's RGBA values
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        resolve({ r, g, b });
      };

      img.onerror = () => {
        // If image fails to load, use default accent blue
        resolve({ r: 74, g: 158, b: 255 });
      };

      img.src = imageUrl;
    });
  }

  // ── APPLY TINT ────────────────────────────────────────────────
  // Takes RGB values and applies them as CSS variables
  // The UI picks these up automatically via var(--dynamic-tint)
  function applyTint(r, g, b) {
    const root = document.documentElement;

    // Main tint — very subtle, 10% opacity so text stays readable
    root.style.setProperty(
      '--dynamic-tint',
      `rgba(${r}, ${g}, ${b}, 0.10)`
    );

    // Stronger version for Now Playing background
    root.style.setProperty(
      '--dynamic-tint-strong',
      `rgba(${r}, ${g}, ${b}, 0.25)`
    );

    // Pure color for accent uses (progress bar etc.)
    root.style.setProperty(
      '--dynamic-color',
      `rgb(${r}, ${g}, ${b})`
    );

    // Apply tint as background on Row 3 (Now Playing row)
    const row3 = document.getElementById('row3');
    if (row3) {
      row3.style.transition = `background ${TRANSITION_DURATION}ms ease`;
      row3.style.background = `rgba(${r}, ${g}, ${b}, 0.08)`;
    }
  }

  // ── RESET TINT ────────────────────────────────────────────────
  // Called when music stops — fades back to default
  function resetTint() {
    const root = document.documentElement;
    root.style.setProperty('--dynamic-tint', 'rgba(74, 158, 255, 0.08)');
    root.style.setProperty('--dynamic-tint-strong', 'rgba(74, 158, 255, 0.15)');
    root.style.setProperty('--dynamic-color', 'rgb(74, 158, 255)');

    const row3 = document.getElementById('row3');
    if (row3) {
      row3.style.background = '';
    }
  }

  // ── PROCESS ───────────────────────────────────────────────────
  // Main entry point — extract color from URL and apply tint
  // Called by now-playing.js every time the song changes
  async function process(imageUrl) {
    if (!imageUrl) {
      resetTint();
      return;
    }

    try {
      const { r, g, b } = await extract(imageUrl);

      // Darken very bright colors so they don't wash out the dark UI
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      let fr = r, fg = g, fb = b;

      if (brightness > 180) {
        // Too bright — dampen by 40%
        fr = Math.round(r * 0.6);
        fg = Math.round(g * 0.6);
        fb = Math.round(b * 0.6);
      }

      applyTint(fr, fg, fb);
    } catch (e) {
      console.error('Color extraction failed:', e);
      resetTint();
    }
  }

  return { process, resetTint };

})();

export { ColorExtractor };