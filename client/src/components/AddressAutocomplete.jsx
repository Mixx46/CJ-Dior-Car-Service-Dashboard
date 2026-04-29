import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { _cache } from '../utils/addressCache';

const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 placeholder:text-gray-600 transition-colors';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function AddressAutocomplete({ value, onChange, placeholder, required }) {
  const [all, setAll]                 = useState([]);
  const [geoResults, setGeoResults]   = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [pos, setPos]                 = useState({ top: 0, bottom: 'auto', left: 0, width: 0, maxHeight: 288 });
  const [userLoc, setUserLoc]         = useState(null);

  const inputRef = useRef(null);
  const listRef  = useRef(null);

  // Get user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {} // silently fail if denied
      );
    }
  }, []);

  // ── 1. Load history addresses (cached) ──────────────────────────────────
  useEffect(() => {
    const now = Date.now();
    if (_cache.data !== null && now - _cache.fetchedAt < CACHE_TTL) {
      setAll(_cache.data);
      return;
    }
    api.get('/reservations/addresses').then(data => {
      _cache.data      = data;
      _cache.fetchedAt = Date.now();
      setAll(data);
    }).catch(() => {});
  }, []);

  // ── 2. Geocoder — debounced 350 ms, fires when value ≥ 3 chars ──────────
  useEffect(() => {
    if (!value || value.length < 3) {
      setGeoResults([]);
      return;
    }
    const timer = setTimeout(() => {
      let url = `/geocode?q=${encodeURIComponent(value)}`;
      if (userLoc) {
        url += `&lat=${userLoc.lat}&lon=${userLoc.lon}`;
      }
      api.get(url)
        .then(data => setGeoResults(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [value, userLoc]);

  // ── 3. Merge history (exact-match first) + geocoder (deduplicated) ───────
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = value.toLowerCase();
    const fromHistory = all.filter(a => a.toLowerCase().includes(q));
    const historySet  = new Set(fromHistory.map(a => a.toLowerCase()));
    const fromGeo     = geoResults.filter(g => !historySet.has(g.toLowerCase()));
    setSuggestions([...fromHistory, ...fromGeo].slice(0, 8));
  }, [value, all, geoResults]);

  // ── 3. Calculate dropdown position from the input's viewport rect ────────
  //    Uses fixed coordinates so the portal renders correctly regardless of
  //    any overflow/scroll ancestor (including the modal's overflow-y-auto).
  //    Caps maxHeight to available space; flips upward when space below < 120px.
  const calcPos = useCallback(() => {
    if (!inputRef.current) return;
    const r          = inputRef.current.getBoundingClientRect();
    const vh         = window.innerHeight;
    const GAP        = 4;
    const ITEM_H     = 36;
    const spaceBelow = vh - r.bottom - GAP;
    const spaceAbove = r.top - GAP;
    const flipUp     = spaceBelow < 120 && spaceAbove > spaceBelow;
    const maxHeight  = Math.min(flipUp ? spaceAbove : spaceBelow, ITEM_H * 8);
    setPos(flipUp
      ? { bottom: vh - r.top + GAP, top: 'auto',      left: r.left, width: r.width, maxHeight }
      : { top: r.bottom + GAP,      bottom: 'auto',   left: r.left, width: r.width, maxHeight }
    );
  }, []);

  // ── 4. Close on outside pointer, scroll, or resize ──────────────────────
  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (e) => {
      if (inputRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const closeAll = () => setOpen(false);

    // pointerdown works on both mouse and touch
    document.addEventListener('pointerdown', closeOnOutside);
    // capture scroll so we catch the modal's internal scroll too
    window.addEventListener('scroll', closeAll, { capture: true, passive: true });
    window.addEventListener('resize', closeAll, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('scroll', closeAll, { capture: true });
      window.removeEventListener('resize', closeAll);
    };
  }, [open]);

  // ── 5. Handlers ─────────────────────────────────────────────────────────
  const pick = useCallback((addr) => {
    onChange(addr);
    setOpen(false);
    setActiveIdx(-1);
  }, [onChange]);

  const handleChange = (e) => {
    onChange(e.target.value);
    setActiveIdx(-1);
    calcPos();
    setOpen(true);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      calcPos();
      setOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        if (activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]); }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  // ── 6. Render ────────────────────────────────────────────────────────────
  const dropdown = open && suggestions.length > 0
    ? createPortal(
        <ul
          ref={listRef}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex: 9999 }}
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-y-auto"
        >
          {suggestions.map((addr, i) => (
            <li
              key={addr}
              // preventDefault keeps input focused; the value is set by pick()
              onPointerDown={(e) => { e.preventDefault(); pick(addr); }}
              className={`px-3 py-2 text-sm cursor-pointer truncate transition-colors ${
                i === activeIdx
                  ? 'bg-brand-500/20 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {addr}
            </li>
          ))}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        className={inputCls}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        spellCheck="false"
      />
      {dropdown}
    </>
  );
}
