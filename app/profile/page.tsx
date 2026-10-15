"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Heart, House, LogOut, MessageCircle, Plus } from "lucide-react";
import { PersonAvatar } from "@/components/chat/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLikedListings, getMyListings } from "@/lib/data/listings";
import { useUnreadChats } from "@/lib/data/use-unread-chats";
import { createClient } from "@/lib/supabase/client";

type Me = {
  id: string;
  email: string;
  displayName: string | null;
  university: string | null;
  isDemo: boolean;
  listings: number | null; // null while loading
  saved: number | null;
};

// "Me" tab: who is signed in, shortcuts to my listings / saved rooms / chats, and sign out.
export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = loading
  const unread = useUnreadChats();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) return setMe(null);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, is_demo, universities(name)")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      const base = {
        id: data.user.id,
        email: data.user.email ?? "",
        displayName: profile?.display_name ?? null,
        university: profile?.universities?.name ?? null,
        isDemo: profile?.is_demo ?? false,
      };
      setMe({ ...base, listings: null, saved: null });
      const [mine, saved] = await Promise.all([
        getMyListings(supabase).catch(() => []),
        getLikedListings(supabase).catch(() => []),
      ]);
      if (!cancelled) setMe({ ...base, listings: mine.length, saved: saved.length });
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Me</h1>

      {me === undefined && (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {me === null && (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re not signed in</CardTitle>
            <CardDescription>Sign in with your university email to list a room, swap and chat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/login?next=/profile" className={buttonVariants({ className: "h-10 w-full" })}>
              Sign in
            </Link>
            <Link href="/map" className={buttonVariants({ variant: "ghost", className: "h-10 w-full" })}>
              Browse the map
            </Link>
          </CardContent>
        </Card>
      )}

      {me && (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-1">
              <PersonAvatar id={me.id} name={me.displayName ?? me.email} className="size-14 text-xl" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-lg font-semibold leading-tight">
                  {me.displayName ?? "Student"}
                  {me.isDemo && <Badge variant="secondary">Demo account</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{me.email}</p>
                <p className="mt-0.5 text-sm">{me.university ?? "University not recognised yet"}</p>
              </div>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Your activity</h2>
            <Card className="py-0">
              <ul className="divide-y">
                <Row href="/listings?view=mine" icon={House} label="My listings" value={me.listings} />
                <Row href="/listings?view=saved" icon={Heart} label="Saved rooms" value={me.saved} />
                <Row href="/messages" icon={MessageCircle} label="Chats" value={unread ? `${unread} unread` : null} highlight={unread > 0} />
                <Row href="/listings/new" icon={Plus} label="List a room" />
              </ul>
            </Card>
          </section>

          <Button variant="outline" className="h-10 w-full gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ href, icon: Icon, label, value, highlight }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number | string | null;
  highlight?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-muted/60">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="flex-1 font-medium">{label}</span>
        {value !== undefined && value !== null && (
          <span className={highlight ? "font-semibold text-rose-600" : "text-muted-foreground"}>{value}</span>
        )}
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
