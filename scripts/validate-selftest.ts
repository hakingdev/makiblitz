/**
 * Assertion suite for lib/waitlist/validate.ts (no test framework in this
 * repo — plain tsx script, non-zero exit on failure):
 *
 *   npm run waitlist:selftest
 */

import {
  normalizeEmail,
  normalizePhone,
  normalizePlz,
} from "../lib/waitlist/validate";

let failures = 0;

function check(what: string, actual: unknown, expected: unknown) {
  if (actual === expected) return;
  failures += 1;
  console.error(`FAIL ${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ---------------------------------------------------------------- email ----
const validEmails: Array<[string, string]> = [
  ["kunde@gmail.com", "kunde@gmail.com"],
  ["  Max.Mustermann@Web.DE ", "max.mustermann@web.de"],
  ["mueller-k@t-online.de", "mueller-k@t-online.de"],
  ["info@mail.uni-wuerzburg.de", "info@mail.uni-wuerzburg.de"],
  ["li.wei@163.com", "li.wei@163.com"], // allowlisted numeric provider
  ["zhang@vip.163.com", "zhang@vip.163.com"],
  ["o'brien+sushi@gmx.net", "o'brien+sushi@gmx.net"],
  ["kunde2024@web.de", "kunde2024@web.de"], // digits in local part are fine
];
for (const [input, expected] of validEmails) {
  check(`email ${input}`, normalizeEmail(input), expected);
}

const invalidEmails = [
  "kunde@gmail",        // no TLD
  "kunde@gmail.c",      // 1-letter TLD
  "foo@bar.123",        // numeric TLD
  "foo@127.0.0.1",      // IP-ish
  "foo bar@gmail.com",  // space
  ".foo@gmail.com",     // leading dot in local part
  "foo.@gmail.com",     // trailing dot in local part
  "fo..o@gmail.com",    // consecutive dots
  "foo@@gmail.com",
  "foo@-bad.de",        // label starts with hyphen
  "@gmail.com",
  "foo@",
  "12345",
  "12345678@123456789.de", // all-digit domains = keyboard mashing …
  "12345@1235.com",
  "123456@123456.de",
  "x@mail.4711.de",        // … also as inner label
];
for (const input of invalidEmails) {
  check(`email ${input}`, normalizeEmail(input), null);
}

// ------------------------------------------------------------------ PLZ ----
const validPlz = ["97688", "97616", "97772", "10115", "20095", "80331", "01067", "99998", " 97688 "];
for (const input of validPlz) {
  check(`plz ${input}`, normalizePlz(input), input.trim());
}

const invalidPlz = [
  "11111", // not assigned in Germany
  "12345", // Großempfänger (companies only), not a delivery PLZ
  "00000",
  "99999",
  "1234",
  "123456",
  "9768a",
  "97 688",
];
for (const input of invalidPlz) {
  check(`plz ${input}`, normalizePlz(input), null);
}

// ---------------------------------------------------------------- phone ----
check("phone empty", normalizePhone(""), "");
check("phone missing", normalizePhone(undefined), "");

const validPhones: Array<[string, string]> = [
  ["+49 171 2345678", "+491712345678"],
  ["+49171 2345678", "+491712345678"],
  ["+49 (0) 171 2345678", "+491712345678"],
  ["0049 171 2345678", "+491712345678"],
  ["0171 2345678", "+491712345678"],
  ["0171/2345678", "+491712345678"],
  ["0176 12345678", "+4917612345678"],     // 11-digit 17x mobile
  ["+49 1512 3456789", "+4915123456789"],  // 15x mobile (11 digits)
  ["0160 1234567", "+491601234567"],       // 16x mobile (10 digits)
  ["0971 1234567", "+499711234567"],       // Bad Kissingen landline
  ["030 901820", "+4930901820"],           // short Berlin landline
  ["09721 123456", "+499721123456"],       // Schweinfurt landline
];
for (const [input, expected] of validPhones) {
  check(`phone ${input}`, normalizePhone(input), expected);
}

const invalidPhones = [
  "111111",           // the reported hole: bare digits, no German prefix
  "123",
  "12345678901",      // bare digits, no prefix
  "0111111",          // NSN starts with 11 — no such block
  "0222222222",       // single repeated digit
  "0123 456789",      // 01x outside the 15/16/17 mobile blocks
  "0150 1234567",     // 150 is not an assigned mobile block
  "0161 1234567",     // 161 is not an assigned mobile block
  "0171 234567",      // mobile too short (9 NSN digits)
  "0171 234567890",   // mobile too long (12 NSN digits)
  "0971 12345678901", // landline too long (12 NSN digits)
  "097112",           // landline too short
  "+43 660 1234567",  // Austria — German numbers only
  "0033 612345678",   // France in 00-form
  "+49",
  "+49 0 0171 2345678", // double trunk zero
  "0171-23456a8",     // letter
  "+49+171 2345678",
  "☎️ 0171 2345678",
];
for (const input of invalidPhones) {
  check(`phone ${input}`, normalizePhone(input), null);
}

// ----------------------------------------------------------------- done ----
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All validation self-tests passed.");
