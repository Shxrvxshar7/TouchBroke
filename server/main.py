# ── MAIN — TOUCHBROKE SERVER ─────────────────────────────────────
# Entry point. Run this file to start everything.
# Usage: python server/main.py
#
# On startup prints:
#   ✓ Open this on her phone: http://192.168.x.x:8080

import asyncio
import socket
import threading
import logging
import http.server
import os
import sys

# Add server/ directory to path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from config           import WS_PORT, HTTP_PORT, CLIENT_DIR
from websocket_server import start_server

log = logging.getLogger("TouchBroke")


# ── GET LOCAL IP ──────────────────────────────────────────────
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ── HTTP SERVER ───────────────────────────────────────────────
def start_http_server():
    os.chdir(str(CLIENT_DIR))

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            super().end_headers()
        def log_message(self, format, *args):
            pass

    server = http.server.HTTPServer(("0.0.0.0", HTTP_PORT), QuietHandler)
    log.info(f"✓ HTTP server serving {CLIENT_DIR} on port {HTTP_PORT}")
    server.serve_forever()


# ── APP DETECTOR ──────────────────────────────────────────────
def start_app_detector():
    from app_detector import AppDetector
    detector = AppDetector()
    detector.start()


# ── STARTUP BANNER ────────────────────────────────────────────
def print_banner(ip):
    print()
    print("=" * 52)
    print("  🎵  TouchBroke is running")
    print("=" * 52)
    print(f"  📱  Open this on her phone:")
    print(f"      http://{ip}:{HTTP_PORT}")
    print()
    print(f"  🔌  WebSocket: ws://{ip}:{WS_PORT}")
    print(f"  📁  Serving:   {CLIENT_DIR}")
    print("=" * 52)
    print("  Waiting for phone to connect...")
    print()


# ── SPOTIFY INIT ──────────────────────────────────────────────
def init_spotify():
    try:
        from actions.spotify import init as spotify_init
        log.info("Initialising Spotify...")
        authenticated = spotify_init()
        if authenticated:
            log.info("✓ Spotify ready")
        else:
            log.warning("Spotify not authenticated — Now Playing disabled")
        return authenticated
    except Exception as e:
        log.error(f"Spotify init error: {e}")
        return False


# ── MAIN ──────────────────────────────────────────────────────
async def main():
    ip = get_local_ip()
    print_banner(ip)

    # Start HTTP server in background thread
    http_thread = threading.Thread(
        target=start_http_server,
        daemon=True
    )
    http_thread.start()

    # Start app detector in background thread
    detector_thread = threading.Thread(
        target=start_app_detector,
        daemon=True
    )
    detector_thread.start()

    # Init Spotify in background thread (OAuth may open browser)
    spotify_thread = threading.Thread(
        target=init_spotify,
        daemon=True
    )
    spotify_thread.start()

    # Start Spotify polling once WebSocket is ready
    # Runs as asyncio background task
    asyncio.create_task(start_spotify_polling())

    main_loop = asyncio.get_event_loop()
    keyboard_thread = threading.Thread(
        target=start_keyboard_watcher,
        args=(main_loop,),
        daemon=True
    )

    keyboard_thread.start()
    # Start WebSocket server — runs forever
    await start_server()


# ── SPOTIFY POLLING TASK ──────────────────────────────────────
async def start_spotify_polling():
    # Wait for Spotify to authenticate (max 60s)
    from actions.spotify import token_data, start_polling
    from websocket_server import send_to_phone

    for _ in range(60):
        if token_data["access_token"]:
            await start_polling(send_to_phone)
            return
        await asyncio.sleep(1)

    log.warning("Spotify polling never started — no token after 60s")

def start_keyboard_watcher(main_loop):
    try:
        from app_detector import KeyboardWatcher
        watcher = KeyboardWatcher(main_loop)
        watcher.start()  # blocking — this thread IS the keyboard thread
    except ImportError:
        log.warning("keyboard library not installed — word suggestions disabled")
    except Exception as e:
        log.error(f"Keyboard watcher failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n  TouchBroke stopped. Goodbye.\n")