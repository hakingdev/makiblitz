"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMessages } from "@/lib/i18n";
import { MAPS_EMBED_URL } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const d = getMessages().contactPage.directions;

/** Remembered per browser; "Karte wieder ausblenden" clears it (Art. 7 Abs. 3 DSGVO). */
const STORAGE_KEY = "ml_maps";

/**
 * Two-click Google Maps: nothing is requested from Google until the visitor
 * clicks "Karte laden" (DSGVO / § 25 TDDDG). Square on phones, 16:9 from sm.
 */
export function DirectionsMap() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setLoaded(true);
    } catch {
      // Storage blocked: the visitor simply clicks again next time.
    }
  }, []);

  function remember(value: boolean) {
    setLoaded(value);
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-blush sm:aspect-[16/9]">
        {loaded ? (
          <iframe
            src={MAPS_EMBED_URL}
            title={d.mapTitle}
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-white">
              <Icon name="pin" className="size-6" />
            </span>
            <p className="max-w-[420px] text-sm leading-[22px] text-muted">
              {d.consent}
              <Link href="/datenschutz" className="focus-ring rounded underline underline-offset-2 hover:text-ink">
                {d.consentLink}
              </Link>
              .
            </p>
            <Button variant="secondary" onClick={() => remember(true)}>
              {d.loadMap}
            </Button>
          </div>
        )}
      </div>
      {loaded && (
        <button
          type="button"
          onClick={() => remember(false)}
          className="focus-ring self-end rounded text-xs leading-5 text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {d.hideMap}
        </button>
      )}
    </div>
  );
}
