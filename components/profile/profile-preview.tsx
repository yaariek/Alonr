"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/chat/person-avatar";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

const DEMO_NATIONALITIES: Record<string, string> = {
  amira: "Moroccan",
  tom: "British",
  mei: "Chinese",
  jonas: "German",
  priya: "Indian",
  leo: "Irish",
  sara: "British",
  omar: "Pakistani",
  chloe: "French",
  ravi: "Indian",
  hana: "Japanese",
  alex: "Canadian",
  elena: "Spanish",
};

export function demoNationalityFor(name: string): string {
  return DEMO_NATIONALITIES[name.trim().toLocaleLowerCase()] ?? "British";
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
  dummyNationality,
}: {
  profileId: string;
  name: string;
  className?: string;
  bio?: string | null;
  nationality?: string | null;
  dummyNationality?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fallbackNationality = nationality ?? (!UUID_PATTERN.test(profileId) ? dummyNationality ?? null : null);
  const [profile, setProfile] = useState({ name, bio: bio ?? "", nationality: fallbackNationality });

  async function openProfile() {
    setProfile({ name, bio: bio ?? "", nationality: fallbackNationality });
    setOpen(true);
    if (!UUID_PATTERN.test(profileId) || (bio !== undefined && nationality !== undefined)) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("display_name, bio, lifestyle").eq("id", profileId).maybeSingle();
      if (data) {
        setProfile({
          name: data.display_name?.trim() || name,
          bio: data.bio?.trim() || "",
          nationality: nationalityFromLifestyle(data.lifestyle) ?? fallbackNationality,
        });
      }
    } catch {
      // Keep the simple demo introduction if profile details are unavailable.
    } finally {
      setLoading(false);
    }
  }

  const intro = profile.bio || (profile.nationality
    ? `I am ${profile.name} from ${profile.nationality}.`
    : `I am ${profile.name}, a student looking for a place to call home.`);

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
            {profile.nationality && <p className="text-xs text-muted-foreground">Nationality: {profile.nationality}</p>}
            {loading && <p className="text-xs text-muted-foreground">Loading profile details…</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
