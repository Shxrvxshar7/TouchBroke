# ── VOLUME ACTIONS ───────────────────────────────────────────────
import logging
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

log = logging.getLogger("TouchBroke")

# ── CACHED INTERFACE ─────────────────────────────────────────────
# COM Activate() is expensive — cache the interface and reuse it.
# On OSError (COM access violation from rapid calls), invalidate
# and recreate once before giving up.
_iface = None

def _get_volume_interface():
    global _iface
    if _iface is None:
        devices  = AudioUtilities.GetSpeakers()
        dev      = getattr(devices, '_dev', devices)
        raw      = dev.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        _iface   = cast(raw, POINTER(IAudioEndpointVolume))
    return _iface

def _invalidate():
    global _iface
    _iface = None
    log.warning("Volume COM interface invalidated — will reinitialise on next call")


def handle_volume(value):
    try:
        _get_volume_interface().SetMasterVolumeLevelScalar(value / 100, None)
        log.info(f"Volume set to {value}%")
    except OSError:
        _invalidate()
        try:
            _get_volume_interface().SetMasterVolumeLevelScalar(value / 100, None)
            log.info(f"Volume set to {value}% (after reinit)")
        except Exception as e:
            log.error(f"Volume error after reinit: {e}")
    except Exception as e:
        log.error(f"Volume error: {e}")


def toggle_mute():
    try:
        iface   = _get_volume_interface()
        current = iface.GetMute()
        iface.SetMute(not current, None)
        log.info(f"Mute toggled → {not current}")
    except OSError:
        _invalidate()
        try:
            iface   = _get_volume_interface()
            current = iface.GetMute()
            iface.SetMute(not current, None)
            log.info(f"Mute toggled (after reinit)")
        except Exception as e:
            log.error(f"Mute error after reinit: {e}")
    except Exception as e:
        log.error(f"Mute error: {e}")


def get_volume():
    try:
        return round(_get_volume_interface().GetMasterVolumeLevelScalar() * 100)
    except OSError:
        _invalidate()
        try:
            return round(_get_volume_interface().GetMasterVolumeLevelScalar() * 100)
        except Exception:
            return 50
    except Exception:
        return 50
