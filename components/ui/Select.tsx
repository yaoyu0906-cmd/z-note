"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  /** Shown next to the trigger button; keeps the picker compact by default. */
  triggerClassName?: string;
  "aria-label"?: string;
}

/**
 * A themed dropdown for short option lists (e.g. code block language).
 *
 * Native <select> popups can't be restyled, so this renders its own menu —
 * but a plain `position: absolute` menu is still clipped by any scrollable
 * ancestor's `overflow` (e.g. the editor's own scroll pane), no matter how
 * carefully its position is computed relative to the viewport. Portaling
 * the menu straight to <body> with `position: fixed` sidesteps that
 * entirely, the same way a real popover would.
 */
export function Select({ value, options, onChange, className = "", triggerClassName = "", ...aria }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Portals need a client-mounted document to render into.
  useEffect(() => setMounted(true), []);

  const MENU_WIDTH = 176; // w-44
  const MENU_HEIGHT_ESTIMATE = 280; // search input + up to ~256px of list

  function computePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < MENU_HEIGHT_ESTIMATE && spaceAbove > spaceBelow;
    setMenuStyle({
      top: openUpward ? rect.top : rect.bottom,
      left: Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
      openUpward,
    });
  }

  useEffect(() => {
    if (!open) return;
    computePosition();
    inputRef.current?.focus();

    // The trigger can move out from under the menu if any ancestor
    // scrolls or the window resizes — close rather than let the menu
    // drift away from what it's supposed to be anchored to. Scrolling
    // *inside* the menu's own option list also fires a (capture-phase)
    // scroll event, so that case must be ignored or the menu would close
    // the instant you tried to scroll through the options.
    function handleScroll(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleResize() {
      computePosition();
    }
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuStyle.openUpward ? undefined : menuStyle.top + 4,
          bottom: menuStyle.openUpward ? window.innerHeight - menuStyle.top + 4 : undefined,
          left: menuStyle.left,
          width: MENU_WIDTH,
        }}
        className="z-50 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
            if (e.key === "Enter" && filtered[0]) {
              onChange(filtered[0].value);
              setOpen(false);
              setQuery("");
            }
          }}
          placeholder="Search…"
          className="w-full mb-1 px-2 py-1 text-xs bg-transparent border-b border-line dark:border-lineDark outline-none text-ink dark:text-inkDark placeholder:text-graphite dark:placeholder:text-graphiteDark"
        />
        {/* Tall enough to show most/all of a typical option list (e.g. the
            21 code-block languages) without needing to scroll to see
            what's available; still scrolls internally if it doesn't fit. */}
        <div className="max-h-72 overflow-y-auto zn-scroll">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setQuery("");
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1 text-xs text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
            >
              <Check
                size={12}
                className={`shrink-0 text-accent dark:text-accentDark ${opt.value === value ? "opacity-100" : "opacity-0"}`}
              />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2.5 py-1.5 text-xs text-graphite dark:text-graphiteDark">No matches.</p>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={aria["aria-label"]}
        aria-expanded={open}
        className={
          `inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide bg-transparent ` +
          `text-graphite dark:text-graphiteDark outline-none border border-transparent ` +
          `hover:border-line dark:hover:border-lineDark rounded px-1.5 py-0.5 ` +
          `${open ? "border-accent dark:border-accentDark text-ink dark:text-inkDark" : ""} ${triggerClassName}`
        }
      >
        {current?.label ?? value}
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
