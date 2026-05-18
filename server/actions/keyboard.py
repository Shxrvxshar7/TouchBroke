# ── KEYBOARD ACTIONS ─────────────────────────────────────────────
# Sends real keyboard shortcuts to Windows when phone sends a tap.
# Uses pyautogui to simulate keypresses at OS level.

import pyautogui
import pyperclip
import time

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.02

# ── ACTION MAP ────────────────────────────────────────────────────
# Maps action name → keyboard shortcut
SHORTCUTS = {
    # Formatting
    "bold":          ("ctrl", "b"),
    "italic":        ("ctrl", "i"),
    "underline":     ("ctrl", "u"),
    "strikethrough": ("ctrl", "5"),

    # Clipboard
    "copy":          ("ctrl", "c"),
    "paste":         ("ctrl", "v"),
    "cut":           ("ctrl", "x"),
    "select_all":    ("ctrl", "a"),

    # Undo / Redo
    "undo":          ("ctrl", "z"),
    "redo":          ("ctrl", "y"),

    # Alignment (Word)
    "align_left":    ("ctrl", "l"),
    "align_center":  ("ctrl", "e"),
    "align_right":   ("ctrl", "r"),
    "align_justify": ("ctrl", "j"),

    # Headings (Word)
    "heading1":      ("ctrl", "alt", "1"),
    "heading2":      ("ctrl", "alt", "2"),
    "normal":        ("ctrl", "alt", "0"),

    # Chrome navigation
    "back":          ("alt", "left"),
    "forward":       ("alt", "right"),
    "refresh":       ("ctrl", "r"),
    "new_tab":       ("ctrl", "t"),
    "close_tab":     ("ctrl", "w"),

    # Excel
    "autosum":       ("alt", "="),
    "function":      ("shift", "f3"),
    "percent":       ("ctrl", "shift", "5"),
    "currency":      ("ctrl", "shift", "4"),
    "comma":         ("ctrl", "shift", "1"),
    "sort_asc":      ("alt", "a", "s", "a"),
    "sort_desc":     ("alt", "a", "s", "d"),
    "filter":        ("ctrl", "shift", "l"),
    "merge":         ("alt", "h", "m", "m"),
    "wrap":          ("alt", "h", "w"),

    # PowerPoint
    "present":       ("f5",),
    "prev_slide":    ("left",),
    "next_slide":    ("right",),

    # VS Code
    "run":           ("f5",),
    "stop":          ("shift", "f5"),
    "debug":         ("ctrl", "shift", "d"),
    "comment":       ("ctrl", "/"),
    "delete_line":   ("ctrl", "shift", "k"),
    "duplicate_line":("shift", "alt", "down"),
    "command_palette":("ctrl", "shift", "p"),
    "quick_open":    ("ctrl", "p"),
    "terminal":      ("ctrl", "`"),

    # System
    "screenshot":    ("win", "shift", "s"),
    "lock":          ("win", "l"),

    # Function keys
    "f1":  ("f1",),  "f2":  ("f2",),  "f3":  ("f3",),
    "f4":  ("f4",),  "f5":  ("f5",),  "f6":  ("f6",),
    "f7":  ("f7",),  "f8":  ("f8",),  "f9":  ("f9",),
    "f10": ("f10",), "f11": ("f11",), "f12": ("f12",),
}


# ── HANDLE KEYBOARD ───────────────────────────────────────────────
def handle_keyboard(action, value=None):

    # Tab switch — Ctrl+1 through Ctrl+9
    if action == "switch_tab" and value is not None:
        idx = int(value) + 1
        if 1 <= idx <= 9:
            pyautogui.hotkey("ctrl", str(idx))
        return

    # Open URL — just paste it into address bar
    if action == "open_url" and value:
        pyautogui.hotkey("ctrl", "l")
        time.sleep(0.1)
        pyperclip.copy(value)
        pyautogui.hotkey("ctrl", "v")
        pyautogui.press("enter")
        return

    # Goto slide
    if action == "goto_slide" and value is not None:
        # In PowerPoint — type slide number and press Enter
        pyautogui.press(str(int(value) + 1))
        pyautogui.press("enter")
        return

    # Look up shortcut in map
    shortcut = SHORTCUTS.get(action)
    if shortcut:
        pyautogui.hotkey(*shortcut)
    else:
        print(f"[keyboard] unknown action: {action}")


# ── INSERT EMOJI ──────────────────────────────────────────────────
def insert_emoji(emoji):
    try:
        pyperclip.copy(emoji)
        pyautogui.hotkey("ctrl", "v")
    except Exception as e:
        print(f"[emoji] failed: {e}")


# ── INSERT SUGGESTION ─────────────────────────────────────────────
def insert_suggestion(word, prefix):
    try:
        # Delete the partial word she already typed
        if prefix:
            for _ in range(len(prefix)):
                pyautogui.press("backspace")
            time.sleep(0.05)

        # Type the full word + space
        pyperclip.copy(word + " ")
        pyautogui.hotkey("ctrl", "v")
    except Exception as e:
        print(f"[suggestion] failed: {e}")