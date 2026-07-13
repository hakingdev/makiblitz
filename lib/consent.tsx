"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Lightweight, self-hosted consent state (§ 25 TDDDG, Art. 6 Abs. 1 lit. a
 * DSGVO) — no third-party CMP.
 *
 * "all"       → the Meta Pixel may load.
 * "necessary" → nothing but technically required storage; no pixel, no
 *               requests to facebook/meta domains.
 *
 * The choice itself is stored in localStorage (technisch notwendig, keine
 * Einwilligung nötig). Storing the choice is not the same as acting on it:
 * the pixel loader keys off `choice === "all"`.
 */

export type ConsentChoice = "all" | "necessary";

const STORAGE_KEY = "mb_consent";

type StoredConsent = { value: ConsentChoice; date: string };

function readStoredConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    return parsed.value === "all" || parsed.value === "necessary"
      ? parsed.value
      : null;
  } catch {
    return null;
  }
}

type ConsentContextValue = {
  /** Persisted choice, or null until the user decides. */
  choice: ConsentChoice | null;
  /** True once the client has read localStorage (avoids SSR/first-paint flash). */
  hydrated: boolean;
  /** Whether the banner is currently visible. */
  bannerOpen: boolean;
  /** True once the `fbq` stub exists — conversion events wait for this. */
  pixelReady: boolean;
  /** Record a choice, persist it and close the banner. */
  accept: (choice: ConsentChoice) => void;
  /** Re-open the banner (e.g. from the "Cookie-Einstellungen" footer link). */
  openBanner: () => void;
  /** Set by the pixel loader once `fbq` is available. */
  setPixelReady: (ready: boolean) => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [pixelReady, setPixelReady] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    setChoice(stored);
    // First visit (no stored choice) → surface the banner.
    setBannerOpen(stored === null);
    setHydrated(true);
  }, []);

  const accept = useCallback((next: ConsentChoice) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ value: next, date: new Date().toISOString() }),
      );
    } catch {
      // Storage blocked (private mode etc.): keep the choice in memory only.
    }
    setChoice(next);
    setBannerOpen(false);
  }, []);

  const openBanner = useCallback(() => setBannerOpen(true), []);

  const value: ConsentContextValue = {
    choice,
    hydrated,
    bannerOpen,
    pixelReady,
    accept,
    openBanner,
    setPixelReady,
  };

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
