/**
 * DSGVO housekeeping (run manually or via cron): deletes "pending"
 * waitlist records older than 30 days that were never confirmed.
 *
 *   npm run waitlist:cleanup            # apply
 *   npm run waitlist:cleanup -- --dry   # preview only
 *
 * Kept untouched:
 *  - "confirmed" / "unsubscribed" records (consent evidence, Art. 7 Abs. 1
 *    DSGVO — retained until the statute of limitations expires)
 *  - "pending" records younger than 30 days (confirmation window)
 *  - "pending" records of confirmed e-mail addresses (part of the
 *    double-opt-in evidence chain)
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "waitlist-submissions.jsonl");
const MAX_AGE_DAYS = 30;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

type Record = {
  type?: string;
  email?: string;
  consentAt?: string;
  createdAt?: string; // legacy records from before the double-opt-in rework
};

const dryRun = process.argv.includes("--dry");

if (!existsSync(LOG_FILE)) {
  console.log(`Nothing to do — ${LOG_FILE} does not exist.`);
  process.exit(0);
}

const lines = readFileSync(LOG_FILE, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "");

const parsed = lines.map((line) => {
  try {
    return { line, record: JSON.parse(line) as Record };
  } catch {
    return { line, record: null };
  }
});

const confirmedEmails = new Set(
  parsed
    .filter(({ record }) => record?.type === "confirmed" && record.email)
    .map(({ record }) => record!.email!),
);

const now = Date.now();
let dropped = 0;

const kept = parsed.filter(({ line, record }) => {
  // Never delete lines we cannot interpret.
  if (!record) {
    console.warn(`Keeping unparsable line: ${line.slice(0, 80)}…`);
    return true;
  }
  // Records without a type are legacy pre-double-opt-in entries → treat as pending.
  const isPending = record.type === "pending" || record.type === undefined;
  if (!isPending) return true;

  if (record.email && confirmedEmails.has(record.email)) return true;

  const timestamp = Date.parse(record.consentAt ?? record.createdAt ?? "");
  if (Number.isNaN(timestamp)) {
    console.warn(
      `Keeping pending record without readable timestamp: ${record.email ?? "?"}`,
    );
    return true;
  }
  if (now - timestamp <= MAX_AGE_MS) return true;

  dropped += 1;
  console.log(
    `${dryRun ? "[dry] would delete" : "Deleting"} unconfirmed pending record: ` +
      `${record.email ?? "?"} (${record.consentAt ?? record.createdAt})`,
  );
  return false;
});

if (dropped === 0) {
  console.log(
    `No unconfirmed pending records older than ${MAX_AGE_DAYS} days.`,
  );
} else if (dryRun) {
  console.log(
    `[dry] ${dropped} record(s) would be deleted, ${kept.length} kept.`,
  );
} else {
  const content = kept.map(({ line }) => line).join("\n");
  writeFileSync(LOG_FILE, content === "" ? "" : `${content}\n`, "utf8");
  console.log(`Deleted ${dropped} record(s), kept ${kept.length}.`);
}
