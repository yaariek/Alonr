import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Sign-in helpers for the login page. Two kinds of account:
// - Real students (…ac.uk): we email them a 6-digit code (and a link), sent via Gmail SMTP
//   (supabase/config.toml). They type the code, or tap the link on the same device.
// - Testers (…@demo.ac.uk, created by data/seed.py): NO email is sent. They type the shared
//   tester code (DEMO_PASSWORD, ask Person C), which is really their password.

type Client = SupabaseClient<Database>;

export type StartResult =
  | { step: "code"; tester: boolean } // show the code box (tester: no email was sent)
  | { step: "error"; message: string };

export type VerifyResult = { ok: true } | { ok: false; message: string };

const TESTER_DOMAIN = "@demo.ac.uk";
export const NOT_A_UNI_EMAIL = "alonr is for university students: sign in with your .ac.uk email.";

const clean = (email: string) => email.trim().toLowerCase();

export function isTesterEmail(email: string): boolean {
  return clean(email).endsWith(TESTER_DOMAIN);
}

export function isUniEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.ac\.uk$/.test(clean(email));
}

// The database rejects non-.ac.uk sign-ups (supabase/migrations/…schema_v1.sql, handle_new_user).
// Depending on the endpoint Supabase returns our message or a generic one; show ours either way.
function friendly(message: string): string {
  if (/university students|database error saving new user/i.test(message)) return NOT_A_UNI_EMAIL;
  if (/rate limit/i.test(message)) return "Too many sign-in emails right now. Wait a few minutes and try again.";
  return message;
}

export async function startSignIn(supabase: Client, email: string): Promise<StartResult> {
  const e = clean(email);
  if (!isUniEmail(e)) return { step: "error", message: NOT_A_UNI_EMAIL };
  if (isTesterEmail(e)) return { step: "code", tester: true };

  const { error } = await supabase.auth.signInWithOtp({
    email: e,
    // The link lands on /auth/callback (app/auth/callback/route.ts) on whichever site they
    // started from (localhost or the live site), which finishes sign-in and opens the map.
    options: {
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  if (error) return { step: "error", message: friendly(error.message) };
  return { step: "code", tester: false };
}

export async function verifyCode(supabase: Client, email: string, code: string): Promise<VerifyResult> {
  const e = clean(email);
  const c = code.trim();
  const { error } = isTesterEmail(e)
    ? await supabase.auth.signInWithPassword({ email: e, password: c })
    : await supabase.auth.verifyOtp({ email: e, token: c, type: "email" });
  if (error) {
    return { ok: false, message: /invalid|expired/i.test(error.message) ? "That code didn't work. Check it and try again." : friendly(error.message) };
  }
  return { ok: true };
}

/** Only allow redirects back into our own app after sign-in (no "?next=https://evil.com"). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/map";
}
