"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Heart, House, LogOut, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Json } from "@/lib/database.types";
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

const COMMON_LANGUAGES = ["Arabic", "Bengali", "Chinese", "English", "French", "German", "Hindi", "Italian", "Japanese", "Mandarin", "Polish", "Portuguese", "Punjabi", "Spanish", "Urdu"];

function isJsonObject(value: Json | null | undefined): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getNationality(value: Json | null | undefined): string {
  if (!isJsonObject(value)) return "";
  return typeof value.nationality === "string" ? value.nationality : "";
}

// "Me" tab: who is signed in, shortcuts to my listings / saved rooms / chats, and sign out.
export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = loading
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [savingLanguages, setSavingLanguages] = useState(false);
  const [profileBio, setProfileBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
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
        .select("display_name, is_demo, languages, bio, lifestyle, universities(name)")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      setSpokenLanguages(profile?.languages ?? []);
      setProfileBio(profile?.bio ?? "");
      setNationality(getNationality(profile?.lifestyle));
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

  function toggleSpokenLanguage(language: string) {
    setSpokenLanguages((current) => current.includes(language)
      ? current.filter((item) => item !== language)
      : [...current, language]);
  }

  function addCustomLanguage() {
    const language = languageInput.trim();
    if (!language) return;
    setSpokenLanguages((current) => current.some((item) => item.toLocaleLowerCase() === language.toLocaleLowerCase())
      ? current
      : [...current, language]);
    setLanguageInput("");
  }

  async function saveSpokenLanguages() {
    if (!me) return;
    setSavingLanguages(true);
    try {
      const { error } = await createClient().from("profiles").update({ languages: spokenLanguages }).eq("id", me.id);
      if (error) throw error;
      toast.success("Your spoken languages have been saved.");
    } catch {
      toast.error("Could not save your languages. Please try again.");
    } finally {
      setSavingLanguages(false);
    }
  }

  async function saveProfileDetails() {
    if (!me) return;
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { data: currentProfile, error: readError } = await supabase
        .from("profiles")
        .select("lifestyle")
        .eq("id", me.id)
        .maybeSingle();
      if (readError) throw readError;
      const existingLifestyle = isJsonObject(currentProfile?.lifestyle) ? currentProfile.lifestyle : {};
      const lifestyle: Json = { ...existingLifestyle, nationality: nationality.trim() || null };
      const { error } = await supabase
        .from("profiles")
        .update({ bio: profileBio.trim() || null, lifestyle })
        .eq("id", me.id);
      if (error) throw error;
      toast.success("Your profile details have been saved.");
    } catch {
      toast.error("Could not save your profile details. Please try again.");
    } finally {
      setSavingProfile(false);
    }
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
              <ProfilePreview profileId={me.id} name={me.displayName ?? me.email} bio={profileBio} nationality={nationality} className="size-14 text-xl" />
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

          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>
                  <span className="block font-semibold">Profile details</span>
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">Edit your bio, nationality, and spoken languages</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <CardContent className="space-y-3 border-t pt-4">
                <label htmlFor="profile-bio" className="block space-y-1.5 text-sm font-medium">
                  Bio
                  <textarea id="profile-bio" value={profileBio} onChange={(event) => setProfileBio(event.target.value)} maxLength={500} rows={4} placeholder="A little about you and what you’re looking for in a home…" className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
                  <span className="block text-right text-xs font-normal text-muted-foreground">{profileBio.length}/500</span>
                </label>
                <label htmlFor="profile-nationality" className="block space-y-1.5 text-sm font-medium">
                  Country of origin <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input id="profile-nationality" value={nationality} onChange={(event) => setNationality(event.target.value)} maxLength={80} placeholder="e.g. Morocco" />
                </label>
                <Button type="button" className="w-full" onClick={saveProfileDetails} disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save profile"}
                </Button>
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h2 className="text-sm font-semibold">Languages you speak</h2>
                    <p className="mt-1 text-sm text-muted-foreground">House Share uses these for language matching.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_LANGUAGES.map((language) => {
                      const selected = spokenLanguages.includes(language);
                      return <button key={language} type="button" aria-pressed={selected} onClick={() => toggleSpokenLanguage(language)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-accent"}`}>
                        {selected && <Check className="size-3" />}{language}
                      </button>;
                    })}
                    {spokenLanguages.filter((language) => !COMMON_LANGUAGES.includes(language)).map((language) => <button key={language} type="button" aria-pressed="true" onClick={() => toggleSpokenLanguage(language)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary bg-primary px-3 text-xs font-medium text-primary-foreground">
                      <Check className="size-3" />{language}<span aria-hidden="true">×</span>
                    </button>)}
                  </div>
                  <div className="flex gap-2">
                    <Input value={languageInput} onChange={(event) => setLanguageInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomLanguage(); } }} placeholder="Add another language" aria-label="Add another language" />
                    <Button type="button" variant="outline" className="shrink-0 gap-1" onClick={addCustomLanguage}><Plus className="size-4" /> Add</Button>
                  </div>
                  <Button type="button" className="w-full" onClick={saveSpokenLanguages} disabled={savingLanguages}>
                    {savingLanguages ? "Saving…" : "Save languages"}
                  </Button>
                </div>
              </CardContent>
            </details>
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
