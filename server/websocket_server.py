# ── WEBSOCKET SERVER ─────────────────────────────────────────────
# The communication hub between phone and laptop.
# Receives tap events from phone → routes to action handlers.
# Sends state updates to phone → app changes, Spotify data, etc.

import asyncio
import json
import logging
import websockets
from config import WS_PORT

# ── LOGGING ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("TouchBroke")

# ── STATE ─────────────────────────────────────────────────────
# Holds the currently connected phone client.
# Only one phone connects at a time.
connected_client = None

# ── DEBOUNCE ──────────────────────────────────────────────────
# Prevents COM crashes from rapid slider drag events.
# Keyed by action name; only the last call within the window runs.
_debounce_tasks: dict = {}

async def _debounced(delay: float, fn):
    await asyncio.sleep(delay)
    fn()

def _schedule_debounced(key: str, delay: float, fn):
    existing = _debounce_tasks.get(key)
    if existing and not existing.done():
        existing.cancel()
    _debounce_tasks[key] = asyncio.ensure_future(_debounced(delay, fn))


# ── SEND TO PHONE ─────────────────────────────────────────────
# Called by other modules to send data to the phone.
# Usage: await send_to_phone({"event": "app_change", "app": "spotify"})
async def send_to_phone(data: dict):
    global connected_client
    if connected_client is None:
        return
    try:
        message = json.dumps(data)
        await connected_client.send(message)
    except websockets.exceptions.ConnectionClosed:
        log.warning("Tried to send but connection was closed")
        connected_client = None


# ── ROUTE MESSAGE ─────────────────────────────────────────────
# Called when phone sends a tap event.
# Reads the 'panel' and 'action' keys and calls the right handler.
async def route_message(data: dict):

    if data.get("type") == "ping":
        return

    # Import action handlers here to avoid circular imports
    from actions.keyboard   import handle_keyboard
    from actions.volume     import handle_volume
    from actions.brightness import handle_brightness

    panel  = data.get("panel", "")
    action = data.get("action", "")
    value  = data.get("value")

    log.info(f"← Phone: panel={panel} action={action} value={value}")

    # ── SYSTEM CONTROLS ───────────────────────────────────────
    if panel == "system":
        if action == "volume":
            v = int(value)
            _schedule_debounced("volume", 0.05, lambda: handle_volume(v))
        elif action == "brightness":
            v = int(value)
            _schedule_debounced("brightness", 0.05, lambda: handle_brightness(v))
        elif action == "mute":
            from actions.volume import toggle_mute
            toggle_mute()
        elif action == "screenshot":
            handle_keyboard("screenshot")
        elif action == "focus_app":
            pass  # Phase 4

        elif action == "copy_color":
            import pyperclip
            pyperclip.copy(str(value))
            log.info(f"Color copied: {value}")

    # ── KEYBOARD SHORTCUTS ────────────────────────────────────
    elif panel in ("word", "excel", "powerpoint", "vscode", "default"):
        handle_keyboard(action)

    # ── SPOTIFY ───────────────────────────────────────────────
    elif panel == "spotify":
        from actions.spotify import handle_spotify_action
        await handle_spotify_action(action, value)

    # ── CHROME ────────────────────────────────────────────────
    elif panel == "chrome":
        handle_keyboard(action, value)

    # ── EMOJI ─────────────────────────────────────────────────
    elif panel == "emoji":
        if action == "insert":
            from actions.keyboard import insert_emoji
            insert_emoji(data.get("value", ""))

    # ── TYPING SUGGESTIONS ────────────────────────────────────
    elif panel == "typing":
        if action == "suggestion":
            from actions.keyboard import insert_suggestion
            insert_suggestion(
                word=data.get("word", ""),
                prefix=data.get("prefix", "")
            )


# ── HANDLE CLIENT ─────────────────────────────────────────────
# Called once per connection — runs for the lifetime of the connection.
async def handle_client(websocket):
    global connected_client
    connected_client = websocket

    client_ip = websocket.remote_address[0]
    log.info(f"✓ Phone connected from {client_ip}")

    # Send current volume and brightness to phone on connect
    try:
        from actions.volume import get_volume
        from actions.brightness import get_brightness
        await send_to_phone({"event": "volume", "value": get_volume()})
        await send_to_phone({"event": "brightness", "value": get_brightness()})
    except Exception as e:
        log.debug(f"Sync error: {e}")

    try:
        # Keep listening for messages until connection closes
        async for raw_message in websocket:
            try:
                data = json.loads(raw_message)
                await route_message(data)
            except json.JSONDecodeError:
                log.error(f"Invalid JSON received: {raw_message}")

    except websockets.exceptions.ConnectionClosedOK as e:
        log.info(f"Phone disconnected cleanly — code={e.code} reason={e.reason!r}")
    except websockets.exceptions.ConnectionClosedError as e:
        log.warning(f"Phone disconnected with error — code={e.code} reason={e.reason!r}")
    except Exception:
        import traceback
        log.error("Unexpected error in handle_client:\n" + traceback.format_exc())
    finally:
        connected_client = None
        log.info("Waiting for phone to reconnect...")


# ── START SERVER ──────────────────────────────────────────────
# Called from main.py — starts the WebSocket server.
async def start_server():
    log.info(f"WebSocket server starting on port {WS_PORT}...")
    async with websockets.serve(handle_client, "0.0.0.0", WS_PORT):
        log.info(f"✓ WebSocket listening on ws://0.0.0.0:{WS_PORT}")
        await asyncio.Future()  # run forever