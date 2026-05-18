# ── APP DETECTOR ─────────────────────────────────────────────────
# Detects which Windows app is in the foreground every 500ms.
# Sends app_change event to phone when the app switches.
# Uses pywin32 (Win32 API) to get the foreground window process.

import time
import asyncio
import logging
import threading

log = logging.getLogger("TouchBroke")

# ── APP MAPPINGS ──────────────────────────────────────────────
# Maps Windows process names to Touch Bar panel names.
# Process names are case-insensitive — we .lower() them first.
APP_MAP = {
    "spotify.exe":       "spotify",
    "winword.exe":       "word",
    "excel.exe":         "excel",
    "powerpnt.exe":      "powerpoint",
    "chrome.exe":        "chrome",
    "msedge.exe":        "chrome",
    "firefox.exe":       "chrome",   # same panel for any browser
    "code.exe":          "vscode",   # VS Code
    "code - insiders.exe": "vscode",
    "photoshop.exe":     "photoshop",
    "figma.exe":         "photoshop",
    "explorer.exe":      "explorer",
    "windowsterminal.exe": "vscode", # terminal gets VS Code panel
}

# These process names are system/UI — ignore them, keep previous app
IGNORED_PROCESSES = {
    "searchhost.exe",
    "searchapp.exe",
    "startmenuexperiencehost.exe",
    "shellexperiencehost.exe",
    "applicationframehost.exe",
    "systemsettings.exe",
    "textinputhost.exe",
    "python.exe",        # ignore our own process
    "python3.exe",
}


class AppDetector:

    def __init__(self):
        self.current_app  = None
        self.loop         = None  # asyncio event loop reference

    # ── GET ACTIVE APP ────────────────────────────────────────
    def get_active_app(self):
        try:
            import win32gui
            import win32process
            import psutil

            # Get foreground window handle
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None

            # Get process ID from window handle
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            if not pid:
                return None

            # Get process name from PID
            process = psutil.Process(pid)
            exe_name = process.name().lower()

            # Skip ignored system processes
            if exe_name in IGNORED_PROCESSES:
                return None

            # Map to panel name — default if not in map
            return APP_MAP.get(exe_name, "default")

        except Exception as e:
            log.debug(f"App detection error: {e}")
            return None

    # ── CHECK CHROME CONTEXT ──────────────────────────────────
    # When Chrome is active, checks if YouTube is playing
    # by reading the window title (contains "YouTube" if on YouTube)
    def get_chrome_context(self):
        try:
            import win32gui
            title = win32gui.GetWindowText(win32gui.GetForegroundWindow()).lower()

            if "youtube" in title:
                return "youtube"
            if "canva" in title:
                return "canva"
            if "whatsapp" in title:
                return "whatsapp"
            return "chrome"
        except Exception:
            return "chrome"

    # ── DETECTION LOOP ────────────────────────────────────────
    # Runs in a background thread every 500ms.
    # When app changes — sends event to phone via WebSocket.
    def _loop(self):
        log.info("✓ App detector running")

        while True:
            try:
                app = self.get_active_app()

                # If Chrome — check what site is open
                if app == "chrome":
                    app = self.get_chrome_context()

                # Only send if app actually changed
                if app and app != self.current_app:
                    self.current_app = app
                    log.info(f"App changed → {app}")

                    # Send to phone — must run in asyncio event loop
                    if self.loop and self.loop.is_running():
                        asyncio.run_coroutine_threadsafe(
                            self._send_app_change(app),
                            self.loop
                        )

            except Exception as e:
                log.debug(f"Detector loop error: {e}")

            time.sleep(0.5)  # check every 500ms

    # ── SEND APP CHANGE ───────────────────────────────────────
    async def _send_app_change(self, app):
        from websocket_server import send_to_phone
        await send_to_phone({
            "event": "app_change",
            "app":   app
        })

    # ── START ─────────────────────────────────────────────────
    def start(self):
        # Get reference to the running asyncio loop
        # so we can schedule coroutines from the thread
        try:
            self.loop = asyncio.get_event_loop()
        except RuntimeError:
            self.loop = asyncio.new_event_loop()

        # Run detection loop in this thread (called from daemon thread in main.py)
        self._loop()