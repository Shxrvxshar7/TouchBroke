// ── HAPTICS ─────────────────────────────────────────────────────
// Vibration feedback for touch interactions.
// Uses the Vibration API — supported in Chrome on Android.

const Haptics = (() => {

  // Check if vibration is supported
  const supported = 'vibrate' in navigator;

  // Standard button tap — 10ms, barely noticeable but feels real
  function tap() {
    if (supported) navigator.vibrate(10);
  }

  // Slider tick — tiny 4ms pulse as thumb moves
  // Called as slider value changes, not on every pixel
  function tick() {
    if (supported) navigator.vibrate(4);
  }

  // Success — double pulse, like a confirmation
  function success() {
    if (supported) navigator.vibrate([10, 30, 10]);
  }

  // Error — longer buzz
  function error() {
    if (supported) navigator.vibrate(80);
  }

  // Like button — satisfying bounce feel
  function like() {
    if (supported) navigator.vibrate([8, 20, 14]);
  }

  return { tap, tick, success, error, like };

})();

export { Haptics };