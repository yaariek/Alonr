"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Home, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  HouseShareDrinkingPreference,
  HouseShareFacilityTag,
  HouseShareGenderPreference,
  HouseShareStudyLevel,
} from "@/lib/types";
import { HOUSE_SHARE_AGE_GROUPS, type HouseShareAgeGroup, type HouseSharePostWithAgeGroup } from "./age-groups";
import { DEMO_HOUSESHARE_POSTS } from "./demo-data";
import { saveLocalHouseSharePost } from "./demo-storage";
import { createClient } from "@/lib/supabase/client";

const AREA_OPTIONS = Array.from(new Set(DEMO_HOUSESHARE_POSTS.flatMap((post) => post.areas))).sort();
const FACILITY_OPTIONS: { value: HouseShareFacilityTag; label: string }[] = [
  { value: "wifi", label: "Wi-Fi" }, { value: "laundry", label: "Laundry" }, { value: "garden", label: "Garden" },
  { value: "bike_storage", label: "Bike storage" }, { value: "dishwasher", label: "Dishwasher" },
  { value: "shared_lounge", label: "Shared lounge" }, { value: "parking", label: "Parking" }, { value: "gym", label: "Gym" },
];

export default function NewHouseShareForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [apartmentName, setApartmentName] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [currentTenants, setCurrentTenants] = useState("2");
  const [totalTenants, setTotalTenants] = useState("3");
  const [studyLevel, setStudyLevel] = useState<HouseShareStudyLevel | "">("");
  const [ageGroup, setAgeGroup] = useState<HouseShareAgeGroup | "">("");
  const [gender, setGender] = useState<HouseShareGenderPreference | "">("");
  const [pets, setPets] = useState("");
  const [smoking, setSmoking] = useState("");
  const [drinking, setDrinking] = useState<HouseShareDrinkingPreference | "">("");
  const [parties, setParties] = useState("");
  const [instruments, setInstruments] = useState("");
  const [facilities, setFacilities] = useState<HouseShareFacilityTag[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleValue<T extends string>(values: T[], value: T, update: (next: T[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = Number(currentTenants);
    const total = Number(totalTenants);
    const weeklyBudget = Number(budget);
    if (!name.trim() || !apartmentName.trim()) {
      toast.error("Add your name and a name for the home.");
      return;
    }
    if (!areas.length) {
      toast.error("Choose at least one preferred area.");
      return;
    }
    if (current < 1 || total <= current) {
      toast.error("Total tenants must be higher than current tenants so there is a room available.");
      return;
    }
    if (!Number.isFinite(weeklyBudget) || weeklyBudget <= 0) {
      toast.error("Enter a weekly budget greater than zero.");
      return;
    }
    if (!studyLevel || !ageGroup || !gender || pets === "" || smoking === "" || !drinking || parties === "" || instruments === "") {
      toast.error("Answer each household preference so students can filter your post.");
      return;
    }

    setBusy(true);
    let languages: string[] = [];
    let userId = "local-user"; // signed out: the post stays anonymous in this browser
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id; // so the avatar opens the poster's real profile
        const { data: profile } = await supabase.from("profiles").select("languages").eq("id", user.id).maybeSingle();
        languages = profile?.languages ?? [];
      }
    } catch {
      // Languages are optional profile details; the demo post can still be saved if profile lookup fails.
    }
    const post: HouseSharePostWithAgeGroup = {
      id: `local-house-share-${crypto.randomUUID()}`,
      user_id: userId,
      name: name.trim(),
      apartment_name: apartmentName.trim(),
      budget: weeklyBudget,
      areas,
      move_in: moveIn,
      looking_for_n: total - current,
      total_tenants: total,
      prefs: {
        study_level: studyLevel,
        age_group: ageGroup,
        gender,
        pets: pets === "true",
        smoking: smoking === "true",
        drinking,
        parties: parties === "true",
        instruments: instruments === "true",
        personality: [],
        languages,
        facilities,
      },
    };

    try {
      saveLocalHouseSharePost(post);
      toast.success("Your demo House Share post is saved in this browser.");
      router.push("/houseshare");
    } catch {
      toast.error("Could not save this demo post in your browser.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-4 sm:px-6">
      <Link href="/houseshare" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 mb-2 gap-1" })}>
        <ArrowLeft className="size-4" /> House Share
      </Link>
      <header className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Student-to-student</p>
        <h1 className="text-2xl font-bold tracking-tight">Create a House Share post</h1>
        <p className="mt-1 text-sm text-muted-foreground">Answer the same details people can filter by, so the right housemates can find you.</p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Home className="size-4 text-primary" /> About the home</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Your first name" htmlFor="host-name"><Input id="host-name" required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Shown on your post" /></Field>
            <Field label="Apartment or house name" htmlFor="apartment-name"><Input id="apartment-name" required maxLength={80} value={apartmentName} onChange={(event) => setApartmentName(event.target.value)} placeholder="e.g. Camden Garden Flat" /></Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Preferred areas</legend>
              <p className="text-xs text-muted-foreground">Choose one or more London areas. Nearby areas can still appear in matches.</p>
              <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-lg border p-2">
                {AREA_OPTIONS.map((area) => {
                  const selected = areas.includes(area);
                  return <button key={area} type="button" aria-pressed={selected} onClick={() => toggleValue(areas, area, setAreas)} className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium ${selected ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{selected && <Check className="size-3" />}{area}</button>;
                })}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weekly budget (£)" htmlFor="budget"><Input id="budget" type="number" min="1" max="2000" required value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="250" /></Field>
              <Field label="Move-in date" htmlFor="move-in"><Input id="move-in" type="date" required value={moveIn} onChange={(event) => setMoveIn(event.target.value)} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4 text-primary" /> House size</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current tenants" htmlFor="current-tenants"><Input id="current-tenants" type="number" min="1" max="20" required value={currentTenants} onChange={(event) => setCurrentTenants(event.target.value)} /></Field>
              <Field label="Total tenants when full" htmlFor="total-tenants"><Input id="total-tenants" type="number" min="2" max="20" required value={totalTenants} onChange={(event) => setTotalTenants(event.target.value)} /></Field>
            </div>
            <p className="text-xs text-muted-foreground">This post will show {Math.max(0, Number(totalTenants) - Number(currentTenants) || 0)} place{Number(totalTenants) - Number(currentTenants) === 1 ? "" : "s"} available.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Household preferences</CardTitle><p className="text-xs text-muted-foreground">These answers appear on your post and match the House Share filters.</p></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Study level" htmlFor="study-level"><SelectField id="study-level" value={studyLevel} onChange={(value) => setStudyLevel(value as HouseShareStudyLevel | "")}><option value="">Choose one</option><option value="undergrad">Undergraduate</option><option value="postgrad">Postgraduate</option></SelectField></Field>
            <Field label="Age group" htmlFor="age-group"><SelectField id="age-group" value={ageGroup} onChange={(value) => setAgeGroup(value as HouseShareAgeGroup | "")}><option value="">Choose one</option>{HOUSE_SHARE_AGE_GROUPS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</SelectField></Field>
            <Field label="Gender preference" htmlFor="gender"><SelectField id="gender" value={gender} onChange={(value) => setGender(value as HouseShareGenderPreference | "")}><option value="">Choose one</option><option value="women">Women</option><option value="men">Men</option><option value="mixed">Mixed</option></SelectField></Field>
            <BooleanField label="Pets allowed?" id="pets" value={pets} onChange={setPets} />
            <BooleanField label="Smoking allowed?" id="smoking" value={smoking} onChange={setSmoking} />
            <Field label="Drinking preference" htmlFor="drinking"><SelectField id="drinking" value={drinking} onChange={(value) => setDrinking(value as HouseShareDrinkingPreference | "")}><option value="">Choose one</option><option value="none">No drinking</option><option value="sometimes">Sometimes</option><option value="often">Often</option></SelectField></Field>
            <BooleanField label="Parties?" id="parties" value={parties} onChange={setParties} yesLabel="Welcome" noLabel="Quiet home" />
            <BooleanField label="Musical instruments allowed?" id="instruments" value={instruments} onChange={setInstruments} />
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">Facilities <span className="font-normal text-muted-foreground">(optional)</span></legend>
              <div className="flex flex-wrap gap-2">{FACILITY_OPTIONS.map((option) => { const selected = facilities.includes(option.value); return <button key={option.value} type="button" aria-pressed={selected} onClick={() => toggleValue(facilities, option.value, setFacilities)} className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-input bg-background hover:bg-accent"}`}>{selected && <Check className="size-3" />}{option.label}</button>; })}</div>
            </fieldset>
          </CardContent>
        </Card>

        <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><Badge variant="secondary" className="mb-1">Demo mode</Badge><p>This post is saved in this browser only. It won’t be sent to Supabase or shown to other users.</p></div>
        <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={busy}>{busy ? "Saving your post…" : "Publish House Share post"}</Button>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function SelectField({ id, value, onChange, children }: { id: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select id={id} required value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{children}</select>;
}

function BooleanField({ label, id, value, onChange, yesLabel = "Yes", noLabel = "No" }: { label: string; id: string; value: string; onChange: (value: string) => void; yesLabel?: string; noLabel?: string }) {
  return <Field label={label} htmlFor={id}><select id={id} required value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><option value="">Choose one</option><option value="true">{yesLabel}</option><option value="false">{noLabel}</option></select></Field>;
}
