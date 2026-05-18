# ── CONFIG ──────────────────────────────────────────────────────
# Loads all settings from .env file.
# Every other server file imports from here.
# Never hardcode values — always add them to .env first.

import os
from dotenv import load_dotenv

# Load .env file into environment variables
load_dotenv()

# ── SERVER SETTINGS ───────────────────────────────────────────
# Port the WebSocket server listens on
WS_PORT = int(os.getenv("WS_PORT", 8765))

# Port the HTTP server serves the phone UI on
HTTP_PORT = int(os.getenv("HTTP_PORT", 8080))

# ── SPOTIFY SETTINGS ──────────────────────────────────────────
SPOTIFY_CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI  = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8888/callback")

# ── APP DETECTOR SETTINGS ─────────────────────────────────────
# How often to check which app is active (milliseconds)
APP_DETECT_INTERVAL = 0.5  # 500ms

# ── PATH SETTINGS ─────────────────────────────────────────────
import pathlib

# Root of the project
ROOT_DIR   = pathlib.Path(__file__).parent.parent

# client/ folder — served to the phone
CLIENT_DIR = ROOT_DIR / "client"