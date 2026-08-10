/**
 * Normalizes a KeyboardEvent into the same "Ctrl+Shift+N" style used in
 * ShortcutBinding.keys / CanvasShortcutBinding.keys. Used both when
 * *recording* a new binding (Settings screens) and when *matching* a
 * keydown against the current bindings (the actual shortcut handlers) —
 * those two call sites have to agree byte-for-byte or a freshly recorded
 * shortcut would silently never fire.
 */
export function eventToKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  // Single-character keys (letters, digits, punctuation) are uppercased
  // for a consistent display ("N", "`", "\"); named keys ("Delete",
  // "Escape", "ArrowUp", "Tab", "F1"...) keep their native casing since
  // they're already meant to be read as words, not letters.
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);
  return parts.join("+");
}

const MODIFIER_KEYS = new Set(["Control", "Shift", "Meta", "Alt"]);

export function isModifierOnly(e: KeyboardEvent): boolean {
  return MODIFIER_KEYS.has(e.key);
}
