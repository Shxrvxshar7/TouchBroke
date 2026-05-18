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
import functools
import os
import sys

# Add server/ directory to path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from config           import WS_PORT, HTTP_PORT, CLIENT_DIR
from websocket_server import start_server

log = logging.getLogger("TouchBroke")


# ── GET LOCAL IP ──────────────────────────────────────────────
# Finds the machine's LAN IP address (e.g. 192.168.1.5)
# This is what the phone types into Chrome
def get_local_ip():
    try:
        # Connect to a public IP (doesn't actually send data)
        # just to find which network interface is used
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ── HTTP SERVER ───────────────────────────────────────────────
# Serves the client/ folder so the phone can load the Touch Bar UI.
# When phone opens http://192.168.x.x:8080 — this responds.
def start_http_server():
    # Change to client directory so files are served from there
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(CLIENT_DIR)
    )

    # Suppress default HTTP server request logs (too noisy)
    class QuietHandler(handler):
        def log_message(self, format, *args):
            pass  # silence default logs

    server = http.server.HTTPServer(("0.0.0.0", HTTP_PORT), QuietHandler)
    log.info(f"✓ HTTP server serving {CLIENT_DIR} on port {HTTP_PORT}")
    server.serve_forever()


# ── APP DETECTOR ──────────────────────────────────────────────
# Starts the app detector in a background thread.
# It checks the active Windows app every 500ms and sends
# app_change events to the phone when the app switches.
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


# ── MAIN ──────────────────────────────────────────────────────
async def main():
    ip = get_local_ip()
    print_banner(ip)

    # Start HTTP server in background thread
    # (it's not async so it runs in its own thread)
    http_thread = threading.Thread(
        target=start_http_server,
        daemon=True  # dies when main program exits
    )
    http_thread.start()

    # Start app detector in background thread
    detector_thread = threading.Thread(
        target=start_app_detector,
        daemon=True
    )
    detector_thread.start()

    # Start WebSocket server — this runs forever on the main thread
    await start_server()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n  TouchBroke stopped. Goodbye.\n")