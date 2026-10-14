"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Me = { email: string; displayName: string | null; university: string | null; isDemo: boolean };

// "Me" tab: who is signed in, and sign out. (Profile editing / lifestyle prefs come later.)
export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setMe(null);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, is_demo, universities(name)")
        .eq("id", data.user.id)
        .maybeSingle();
      setMe({
        email: data.user.email ?? "",
        displayName: profile?.display_name ?? null,
        university: profile?.universities?.name ?? null,
        isDemo: profile?.is_demo ?? false,
      });
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <Card>
        {me === undefined && <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent>}

        {me === null && (
          <>
            <CardHeader>
              <CardTitle>You&apos;re not signed in</CardTitle>
              <CardDescription>Sign in with your university email to list a room, swap and chat.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login?next=/profile" className={buttonVariants({ className: "h-10 w-full" })}>
                Sign in
              </Link>
            </CardContent>
          </>
        )}

        {me && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {me.displayName ?? "Your profile"}
                {me.isDemo && <Badge variant="secondary">Demo account</Badge>}
              </CardTitle>
              <CardDescription>{me.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                <span className="text-muted-foreground">University: </span>
                {me.university ?? "Not recognised yet"}
              </p>
              <Button variant="outline" className="h-10 w-full" onClick={signOut}>
                Sign out
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
