"use client";

import { useEffect, useRef, useState } from "react";
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
 * Native <select> popups can't be restyled — their menu chrome always
 * renders with the OS/browser's own colors, which looks broken next to
 * the app's dark theme. This renders the whole menu ourselves instead.
 */
export function Select({ value, options, onChange, className = "", triggerClassName = "", ...aria }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Menu is ~220px tall at most (search input + up to ~208px of list).
  // If there isn't room below the trigger but there is above, flip it —
  // otherwise it renders past the viewport/scroll container edge and gets
  // visually clipped.
  const MENU_HEIGHT_ESTIMATE = 220;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < MENU_HEIGHT_ESTIMATE && spaceAbove > spaceBelow);
    }
    inputRef.current?.focus();
  }, [open]);

  const current = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
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

      {open && (
        <div
          className={`absolute right-0 z-50 w-40 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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
          <div className="max-h-52 overflow-y-auto zn-scroll">
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
      )}
    </div>
  );
}
