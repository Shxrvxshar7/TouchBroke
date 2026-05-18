# ── VOLUME ACTIONS ───────────────────────────────────────────────
import logging
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

log = logging.getLogger("TouchBroke")

def _get_volume_interface():
    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    return cast(interface, POINTER(IAudioEndpointVolume))

def handle_volume(value):
    try:
        volume = _get_volume_interface()
        # pycaw uses 0.0 to 1.0 — convert from 0-100
        volume.SetMasterVolumeLevelScalar(value / 100, None)
        log.info(f"Volume set to {value}%")
    except Exception as e:
        log.error(f"Volume error: {e}")

def toggle_mute():
    try:
        volume = _get_volume_interface()
        current = volume.GetMute()
        volume.SetMute(not current, None)
        log.info(f"Mute toggled → {not current}")
    except Exception as e:
        log.error(f"Mute error: {e}")

def get_volume():
    try:
        volume = _get_volume_interface()
        return round(volume.GetMasterVolumeLevelScalar() * 100)
    except Exception:
        return 50