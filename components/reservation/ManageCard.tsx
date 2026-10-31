"use client";

import { useState } from "react";
import { getMessages } from "@/lib/i18n";
import type { ManageState } from "@/lib/reservation/manage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MapsLink } from "@/components/ui/ContactLinks";
import { VisitSummary } from "@/components/reservation/VisitSummary";
import type { Visit } from "@/components/reservation/ReservationProvider";

const t = getMessages();
const m = t.managePage;

type Action = "confirm" | "cancel";

/**
 * The card on /r/<token>. The state comes from the server once and then from
 * each button's API answer — the card switches right away ("Danke, bis
 * bald!" / "abgesagt") instead of waiting for a page refresh, and the buttons
 * stay disabled while a request runs, so nothing can be sent twice.
 */
export function ManageCard({
  token,
  initialState,
  firstName,
  visit,
}: {
  token: string;
  initialState: ManageState;
  firstName: string;
  visit: Visit;
}) {
  const [state, setState] = useState<ManageState>(initialState);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [failed, setFailed] = useState(false);
  const copy = m[state];

  async function send(action: Action) {
    if (busy) return;
    setBusy(action);
    setFailed(false);
    try {
      const res = await fetch(`/api/r/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as { state?: ManageState };
      // 409 also carries the real state (already cancelled / in the past).
      if (!data.state || (!res.ok && res.status !== 409)) throw new Error(String(res.status));
      if (action === "confirm" && data.state !== "confirmed" && res.ok) throw new Error("not confirmed");
      setState(data.state);
      setAsking(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center gap-6 text-center lg:rounded-3xl lg:border lg:border-line lg:bg-white lg:p-12">
      <p className="text-[11px] font-bold leading-4 text-brand">{m.eyebrow}</p>
      {state === "confirmed" && (
        <div className="grid size-[72px] place-items-center rounded-full bg-blush">
          <Icon name="check-32" />
        </div>
      )}
      <h1 aria-live="polite" className="text-[38px] font-extrabold leading-[45px] lg:text-[52px] lg:leading-[60px]">
        {copy.title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className="text-[15px] leading-[25px] text-muted">{copy.body.replace("{name}", firstName)}</p>

      {state !== "cancelled" && (
        <>
          <VisitSummary visit={visit} className="w-full" />
          <p className="text-sm leading-[22px] text-muted">
            <MapsLink className="hover:text-ink">
              {t.contact.street}, {t.contact.city}
            </MapsLink>
          </p>
        </>
      )}

      {(state === "pending" || state === "confirmed") && (
        <div className="flex w-full flex-col items-center gap-3">
          {asking ? (
            <div role="alertdialog" aria-labelledby="cancel-ask" className="flex w-full flex-col gap-3 rounded-2xl border border-line bg-white p-4">
              <p id="cancel-ask" className="text-sm font-bold leading-[22px]">
                {m.cancelAsk}
              </p>
              <Button onClick={() => send("cancel")} disabled={busy !== null} className="w-full">
                {m.cancelYes}
              </Button>
              <Button variant="secondary" onClick={() => setAsking(false)} disabled={busy !== null} className="w-full">
                {m.cancelNo}
              </Button>
            </div>
          ) : state === "pending" ? (
            <>
              <Button onClick={() => send("confirm")} disabled={busy !== null} className="w-full">
                {busy === "confirm" ? m.sending : m.confirm}
              </Button>
              <Button variant="secondary" onClick={() => setAsking(true)} disabled={busy !== null} className="w-full">
                {m.cancel}
              </Button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="focus-ring rounded text-sm font-bold leading-5 text-brand hover:text-brand-dark"
            >
              {m.cancelLater}
            </button>
          )}
          {failed && (
            <p role="alert" className="text-xs font-bold leading-[18px] text-brand">
              {m.error}
            </p>
          )}
        </div>
      )}

      {(state === "cancelled" || state === "past") && (
        <ButtonLink href="/reservieren" className="w-full">
          {m.newBooking}
        </ButtonLink>
      )}
    </div>
  );
}
