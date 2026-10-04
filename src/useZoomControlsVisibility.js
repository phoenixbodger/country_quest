import { useState, useEffect } from 'react';

/**
 * Shared, app-wide preference for whether the zoom controls are visible.
 *
 * Backed by localStorage so the choice persists across sessions and is consistent
 * across every screen that renders a globe. Because the store lives at module
 * scope with a subscriber set, all rendered <GlobeZoomControls> instances stay in
 * sync live (e.g. collapsing on one screen keeps it collapsed everywhere).
 */

const STORAGE_KEY = 'countryquest.showZoomControls';

let visibility = null; // null = not yet initialised (defaults to true / shown)
const listeners = new Set();

function readStored() {
  if (visibility != null) return visibility;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    visibility = raw == null ? true : raw !== 'false';
  } catch {
    // localStorage unavailable (private mode / SSR) — fall back to shown.
    visibility = true;
  }
  return visibility;
}

function writeStored(value) {
  visibility = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore — keep in-memory value for this session.
  }
}

export function setZoomControlsVisible(value) {
  const next = Boolean(value);
  writeStored(next);
  listeners.forEach((fn) => fn(next));
}

/**
 * Returns [visible, setVisible] for the global "show zoom controls" preference.
 */
export function useZoomControlsVisible() {
  const [visible, setVisible] = useState(readStored);

  useEffect(() => {
    listeners.add(setVisible);
    return () => listeners.delete(setVisible);
  }, []);

  return [visible, setZoomControlsVisible];
}