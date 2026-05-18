# ── BRIGHTNESS ACTIONS ───────────────────────────────────────────
import logging
import screen_brightness_control as sbc

log = logging.getLogger("TouchBroke")

def handle_brightness(value):
    try:
        sbc.set_brightness(value)
        log.info(f"Brightness set to {value}%")
    except Exception as e:
        log.error(f"Brightness error: {e}")

def get_brightness():
    try:
        return sbc.get_brightness()[0]
    except Exception:
        return 50