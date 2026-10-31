"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

const m = getMessages().managePage;

type Action = "confirm" | "cancel";

/** Buttons on /r/<token>: confirm, or cancel after a second "Ja, absagen". */
export function ManageActions({ token, state }: { token: string; state: "pending" | "confirmed" }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [failed, setFailed] = useState(false);

  async function send(action: Action) {
    setBusy(action);
    setFailed(false);
    try {
      const res = await fetch(`/api/r/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      // 409: already cancelled or in the past — the refreshed page shows it.
      if (!res.ok && res.status !== 409) throw new Error(String(res.status));
      setAsking(false);
      router.refresh();
    } catch {
      setFailed(true);
    }
    setBusy(null);
  }

  return (
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
            {m.confirm}
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
  );
}
