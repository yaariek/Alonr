import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Sign-in emails link here (see startSignIn in lib/auth.ts). Supabase adds ?code=…;
// swapping it for a session sets the login cookies, then we open the app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // Missing, expired or already-used link
  return NextResponse.redirect(`${origin}/login?error=link`);
}
