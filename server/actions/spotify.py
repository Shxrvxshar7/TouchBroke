# ── SPOTIFY ACTIONS ──────────────────────────────────────────────
# Handles OAuth 2.0 authentication and Now Playing polling.
# On first run — opens browser for Spotify login.
# After that — auto-refreshes token silently.

import asyncio
import json
import logging
import time
import threading
import webbrowser
import urllib.parse
import urllib.request
import http.server
from pathlib import Path

import requests

from config import (
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI,
)

log = logging.getLogger("TouchBroke")

# ── TOKEN STORAGE ─────────────────────────────────────────────────
# Saves token to a file so she only logs in once ever
TOKEN_FILE = Path(__file__).parent.parent.parent / ".spotify_cache"

token_data = {
    "access_token":  None,
    "refresh_token": None,
    "expires_at":    0,
}


# ── SAVE / LOAD TOKEN ─────────────────────────────────────────────
def save_token():
    try:
        TOKEN_FILE.write_text(json.dumps(token_data))
    except Exception as e:
        log.error(f"Failed to save token: {e}")

def load_token():
    try:
        if TOKEN_FILE.exists():
            data = json.loads(TOKEN_FILE.read_text())
            token_data.update(data)
            log.info("✓ Spotify token loaded from cache")
            return True
    except Exception:
        pass
    return False


# ── OAUTH FLOW ────────────────────────────────────────────────────
# Opens browser → user logs in → Spotify redirects to localhost
# → we catch the auth code → exchange for access token

auth_code_received = None

class CallbackHandler(http.server.BaseHTTPRequestHandler):
    """Tiny HTTP server that catches Spotify's OAuth redirect."""

    def do_GET(self):
        global auth_code_received
        # Parse the ?code= parameter from the redirect URL
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            auth_code_received = params["code"][0]
            # Send success page to browser
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"""
                <html><body style='font-family:sans-serif;text-align:center;padding:60px;background:#000;color:#fff'>
                <h2>&#127925; TouchBroke connected to Spotify!</h2>
                <p style='color:#8e8e93'>You can close this tab.</p>
                </body></html>
            """)
        else:
            self.send_response(400)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # silence server logs


def run_oauth():
    """Full OAuth 2.0 flow — opens browser, catches redirect, gets token."""
    global auth_code_received

    if not SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_ID == "your_client_id_here":
        log.error("Spotify Client ID not set in .env — skipping Spotify")
        return False

    # Build authorization URL
    scopes = " ".join([
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
        "user-library-modify",
        "user-library-read",
    ])

    auth_url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode({
        "client_id":     SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  SPOTIFY_REDIRECT_URI,
        "scope":         scopes,
    })

    # Start local server to catch the redirect
    server = http.server.HTTPServer(("127.0.0.1", 8888), CallbackHandler)
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    # Open browser for login
    log.info("Opening Spotify login in browser...")
    webbrowser.open(auth_url)

    # Wait for auth code (max 120 seconds)
    timeout = time.time() + 120
    while auth_code_received is None and time.time() < timeout:
        time.sleep(0.5)

    if not auth_code_received:
        log.error("Spotify login timed out")
        return False

    # Exchange auth code for access token
    return exchange_code(auth_code_received)


def exchange_code(code):
    """Exchange auth code for access + refresh tokens."""
    try:
        response = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type":   "authorization_code",
                "code":         code,
                "redirect_uri": SPOTIFY_REDIRECT_URI,
            },
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        data = response.json()

        if "access_token" not in data:
            log.error(f"Token exchange failed: {data}")
            return False

        token_data["access_token"]  = data["access_token"]
        token_data["refresh_token"] = data.get("refresh_token")
        token_data["expires_at"]    = time.time() + data.get("expires_in", 3600)

        save_token()
        log.info("✓ Spotify authenticated successfully")
        return True

    except Exception as e:
        log.error(f"Token exchange error: {e}")
        return False


def refresh_token():
    """Refresh the access token using the refresh token."""
    if not token_data["refresh_token"]:
        return False
    try:
        response = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type":    "refresh_token",
                "refresh_token": token_data["refresh_token"],
            },
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        data = response.json()

        if "access_token" not in data:
            log.error(f"Token refresh failed: {data}")
            return False

        token_data["access_token"] = data["access_token"]
        token_data["expires_at"]   = time.time() + data.get("expires_in", 3600)

        # Some responses include a new refresh token
        if "refresh_token" in data:
            token_data["refresh_token"] = data["refresh_token"]

        save_token()
        log.info("✓ Spotify token refreshed")
        return True

    except Exception as e:
        log.error(f"Token refresh error: {e}")
        return False


def get_valid_token():
    """Returns a valid access token, refreshing if needed."""
    # Refresh 60 seconds before expiry
    if time.time() >= token_data["expires_at"] - 60:
        refresh_token()
    return token_data["access_token"]


# ── SPOTIFY API CALLS ─────────────────────────────────────────────
def get_headers():
    return {"Authorization": f"Bearer {get_valid_token()}"}


def get_now_playing():
    """Fetches current track from Spotify Web API."""
    try:
        response = requests.get(
            "https://api.spotify.com/v1/me/player/currently-playing",
            headers=get_headers(),
            timeout=3,
        )

        if response.status_code == 204:
            return None  # nothing playing

        if response.status_code == 401:
            refresh_token()
            return None

        if response.status_code != 200:
            return None

        data = response.json()
        if not data or not data.get("item"):
            return None

        item = data["item"]
        return {
            "id":           item["id"],
            "name":         item["name"],
            "artist":       ", ".join(a["name"] for a in item["artists"]),
            "album":        item["album"]["name"],
            "album_art":    item["album"]["images"][0]["url"] if item["album"]["images"] else None,
            "duration_ms":  item["duration_ms"],
            "progress_ms":  data["progress_ms"],
            "is_playing":   data["is_playing"],
        }

    except Exception as e:
        log.debug(f"Now playing fetch error: {e}")
        return None


# ── PLAYBACK CONTROLS ─────────────────────────────────────────────
def spotify_put(endpoint, payload=None):
    try:
        requests.put(
            f"https://api.spotify.com/v1/me/player/{endpoint}",
            headers=get_headers(),
            json=payload,
            timeout=3,
        )
    except Exception as e:
        log.error(f"Spotify PUT error: {e}")

def spotify_post(endpoint, payload=None):
    try:
        requests.post(
            f"https://api.spotify.com/v1/me/player/{endpoint}",
            headers=get_headers(),
            json=payload,
            timeout=3,
        )
    except Exception as e:
        log.error(f"Spotify POST error: {e}")


async def handle_spotify_action(action, value=None):
    """Routes phone tap actions to Spotify API calls."""

    if action == "play_pause":
        track = get_now_playing()
        if track and track["is_playing"]:
            spotify_put("pause")
        else:
            spotify_put("play")

    elif action == "next_track":
        spotify_post("next")

    elif action == "prev_track":
        spotify_post("previous")
    #changed the bug for on and off
    elif action == "shuffle":
        try:
            # Get current playback state
            response = requests.get(
                "https://api.spotify.com/v1/me/player",
                headers=get_headers(),
                timeout=3,
            )
            if response.status_code == 200:
                current_shuffle = response.json().get("shuffle_state", False)
                new_state = "true" if not current_shuffle else "false"
                spotify_put(f"shuffle?state={new_state}")
                log.info(f"Shuffle toggled → {new_state}")
        except Exception as e:
            log.error(f"Shuffle error: {e}")

    elif action == "repeat":
        try:
            # Get current playback state
            response = requests.get(
                "https://api.spotify.com/v1/me/player",
                headers=get_headers(),
                timeout=3,
            )
            if response.status_code == 200:
                current_repeat = response.json().get("repeat_state", "off")
                # Cycle: off → context → track → off
                states = {"off": "context", "context": "track", "track": "off"}
                new_state = states.get(current_repeat, "off")
                spotify_put(f"repeat?state={new_state}")
                log.info(f"Repeat toggled → {new_state}")
        except Exception as e:
            log.error(f"Repeat error: {e}")


    elif action == "seek" and value is not None:
        spotify_put(f"seek?position_ms={int(value)}")

    elif action == "like":
        track = get_now_playing()
        if not track:
            log.warning("Like failed — no track playing")
            return

        track_id = track["id"]
        log.info(f"Like action: value={value} track={track['name']}")

        try:
            if value:
                # Add to liked songs
                response = requests.put(
                    f"https://api.spotify.com/v1/me/tracks",
                    headers={**get_headers(), "Content-Type": "application/json"},
                    json={"ids": [track_id]},
                    timeout=5,
                )
                log.info(f"Liked '{track['name']}' — status: {response.status_code}")
            else:
                # Remove from liked songs
                response = requests.delete(
                    f"https://api.spotify.com/v1/me/tracks",
                    headers={**get_headers(), "Content-Type": "application/json"},
                    json={"ids": [track_id]},
                    timeout=5,
                )
                log.info(f"Unliked '{track['name']}' — status: {response.status_code}")
        except Exception as e:
            log.error(f"Like error: {e}")


# ── NOW PLAYING POLLING LOOP ──────────────────────────────────────
# Runs every 2 seconds, sends track data to phone via WebSocket

_polling = False

async def start_polling(send_fn):
    """
    Polls Spotify every 2s and sends now_playing events to phone.
    send_fn = websocket_server.send_to_phone
    """
    global _polling
    _polling = True
    log.info("✓ Spotify polling started")

    last_track_id = None

    while _polling:
        try:
            track = get_now_playing()

            if track:
                await send_fn({
                    "event": "now_playing",
                    "track": track,
                })
                last_track_id = track["id"]
            else:
                # Nothing playing — tell phone to reset
                if last_track_id is not None:
                    await send_fn({
                        "event": "now_playing",
                        "track": None,
                    })
                    last_track_id = None

        except Exception as e:
            log.debug(f"Polling error: {e}")

        await asyncio.sleep(2)


def stop_polling():
    global _polling
    _polling = False


# ── INIT ──────────────────────────────────────────────────────────
def init():
    """
    Called from main.py on startup.
    Loads cached token or runs OAuth flow.
    Returns True if authenticated.
    """
    if load_token():
        # Try to refresh existing token
        if refresh_token():
            return True

    # No valid token — run full OAuth flow
    return run_oauth()