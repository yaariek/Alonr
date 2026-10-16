"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/chat/person-avatar";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

const DEMO_PROFILES: Record<string, { country: string; languages: string[] }> = {
  "demo judge": { country: "United Kingdom", languages: ["English"] },
  amira: { country: "Morocco", languages: ["English", "Arabic"] },
  tom: { country: "United Kingdom", languages: ["English"] },
  mei: { country: "China", languages: ["English", "Mandarin"] },
  jonas: { country: "Germany", languages: ["English", "German"] },
  priya: { country: "India", languages: ["English", "Hindi"] },
  leo: { country: "Ireland", languages: ["English", "Italian"] },
  sara: { country: "United Kingdom", languages: ["English", "Swedish"] },
  omar: { country: "Pakistan", languages: ["English", "Arabic", "French"] },
  chloe: { country: "France", languages: ["English", "French"] },
  ravi: { country: "India", languages: ["English", "Tamil"] },
  hana: { country: "Japan", languages: ["English", "Japanese"] },
  alex: { country: "Canada", languages: ["English"] },
  elena: { country: "Spain", languages: ["English", "Spanish"] },
};

function demoProfileFor(name: string) {
  return DEMO_PROFILES[name.trim().toLocaleLowerCase()] ?? { country: "United Kingdom", languages: ["English"] };
}

export function demoNationalityFor(name: string): string {
  return demoProfileFor(name).country;
}

function formatLanguages(languages: string[]): string {
  if (languages.length < 2) return languages[0] ?? "English";
  if (languages.length === 2) return `${languages[0]} and ${languages[1]}`;
  return `${languages.slice(0, -1).join(", ")} and ${languages[languages.length - 1]}`;
}

function nationalityFromLifestyle(lifestyle: Json | null | undefined): string | null {
  if (!lifestyle || typeof lifestyle !== "object" || Array.isArray(lifestyle)) return null;
  const nationality = lifestyle.nationality;
  return typeof nationality === "string" && nationality.trim() ? nationality : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ProfilePreview({
  profileId,
  name,
  className,
  bio,
  nationality,
  languages,
  dummyNationality,
}: {
  profileId: string;
  name: string;
  className?: string;
  bio?: string | null;
  nationality?: string | null;
  languages?: string[];
  dummyNationality?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fallbackNationality = nationality ?? (!UUID_PATTERN.test(profileId) ? dummyNationality ?? null : null);
  const fallbackLanguages = languages ?? (!UUID_PATTERN.test(profileId) ? demoProfileFor(name).languages : []);
  const [profile, setProfile] = useState({ name, bio: bio ?? "", nationality: fallbackNationality, languages: fallbackLanguages });

  async function openProfile() {
    setProfile({ name, bio: bio ?? "", nationality: fallbackNationality, languages: fallbackLanguages });
    setOpen(true);
    if (!UUID_PATTERN.test(profileId) || (bio !== undefined && nationality !== undefined && languages !== undefined)) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("display_name, bio, lifestyle, languages").eq("id", profileId).maybeSingle();
      if (data) {
        setProfile({
          name: data.display_name?.trim() || name,
          bio: data.bio?.trim() || "",
          nationality: nationalityFromLifestyle(data.lifestyle) ?? fallbackNationality,
          languages: data.languages ?? fallbackLanguages,
        });
      }
    } catch {
      // Keep the simple demo introduction if profile details are unavailable.
    } finally {
      setLoading(false);
    }
  }

  const defaultIntro = `My name is ${profile.name}${profile.nationality ? ` and I am from ${profile.nationality}` : ""}. I can speak ${formatLanguages(profile.languages)}.`;
  const intro = profile.bio || defaultIntro;

  return (
    <>
      <button type="button" onClick={() => void openProfile()} aria-label={`View ${name}'s profile`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <PersonAvatar id={profileId} name={name} className={className} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1"><PersonAvatar id={profileId} name={profile.name} className="size-14 text-xl" /></div>
            <DialogTitle>{profile.name}</DialogTitle>
            <DialogDescription>Student profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-muted/60 p-3">
            <p className="text-sm leading-relaxed">{intro}</p>
            {profile.nationality && <p className="text-xs text-muted-foreground">From: {profile.nationality}</p>}
            {profile.languages.length > 0 && <p className="text-xs text-muted-foreground">Languages: {profile.languages.join(", ")}</p>}
            {loading && <p className="text-xs text-muted-foreground">Loading profile details…</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
