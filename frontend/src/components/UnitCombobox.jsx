import React, { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";
import { Check } from "lucide-react";
import { UNITS } from "../lib/units";

/**
 * Smart searchable unit selector.
 * - Type first letter(s) to prefix-filter units (e.g. "P" -> PCS, PACK, PAIR)
 * - First match auto-highlighted; Enter selects it
 * - Arrow Up/Down to navigate; Escape to close
 * - Shows max 5 matches, sorted by most commonly used first
 */
export function UnitCombobox({ value, onChange, testid = "unit-combobox", className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const q = query.trim().toLowerCase();
  const matches = (q ? UNITS.filter((u) => u.toLowerCase().startsWith(q)) : UNITS).slice(0, 5);

  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (u) => { onChange(u); setQuery(""); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[highlight]) select(matches[highlight]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        data-testid={testid}
        className={className}
        value={open ? query : value || ""}
        placeholder="Unit"
        autoComplete="off"
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {open && matches.length > 0 && (
        <div data-testid={`${testid}-list`} className="absolute z-50 mt-1 w-full min-w-[120px] bg-white border border-border rounded-md shadow-lg py-1 max-h-60 overflow-auto">
          {matches.map((u, i) => (
            <button
              type="button"
              key={u}
              data-testid={`${testid}-option-${u}`}
              onMouseDown={(e) => { e.preventDefault(); select(u); }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between transition-colors ${i === highlight ? "bg-iip-blue text-white" : "hover:bg-muted text-[#0F172A]"}`}
            >
              <span>{u}</span>
              {value === u && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
