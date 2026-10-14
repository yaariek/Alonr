import { SupabaseClient } from '@supabase/supabase-js';

export const NOT_A_UNI_EMAIL = "Please use a valid UK university email address ending in .ac.uk";

/**
 * Checks if an email is a demo/tester account (@demo.ac.uk)
 */
export function isTesterEmail(rawEmail: string): boolean {
  return rawEmail.trim().toLowerCase().endsWith('@demo.ac.uk');
}

/**
 * Checks if an email is a valid UK university address (.ac.uk)
 */
export function isUniEmail(rawEmail: string): boolean {
  return rawEmail.trim().toLowerCase().endsWith('.ac.uk');
}

export async function startSignIn(supabase: SupabaseClient, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();

  if (!isUniEmail(email)) {
    return { step: 'error', message: NOT_A_UNI_EMAIL };
  }

  // Demo/tester accounts bypass OTP email sending
  if (isTesterEmail(email)) {
    return { step: 'code', tester: true };
  }

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    if (error.message.includes('Database error') || error.message.includes('saving new user')) {
      return { step: 'error', message: NOT_A_UNI_EMAIL };
    }
    return { step: 'error', message: error.message };
  }

  return { step: 'check-email', tester: false };
}

export async function verifyCode(supabase: SupabaseClient, rawEmail: string, rawCode: string) {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.trim();

  // Demo accounts log in via password authentication
  if (isTesterEmail(email)) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: code,
    });

    if (error) {
      return { ok: false, message: "That code didn't work. Check it and try again." };
    }
    return { ok: true };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  if (error) {
    return { ok: false, message: "That code didn't work. Check it and try again." };
  }

  return { ok: true };
}
