# ── KEYBOARD ACTIONS ─────────────────────────────────────────────
# Placeholder — full implementation in Phase 4
# This prevents import errors while Phase 3 is being tested

import pyautogui
import pyperclip

pyautogui.FAILSAFE = False

def handle_keyboard(action, value=None):
    print(f"[keyboard] action={action} value={value}")

def insert_emoji(emoji):
    pyperclip.copy(emoji)
    pyautogui.hotkey('ctrl', 'v')

def insert_suggestion(word, prefix):
    # Backspace the prefix, type the full word + space
    if prefix:
        for _ in range(len(prefix)):
            pyautogui.press('backspace')
    pyautogui.typewrite(word + ' ', interval=0.02)