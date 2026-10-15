"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, MapPin, MessageCircle, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DEMO_HOUSESHARE_POSTS } from "./demo-data";
import type { HouseSharePost } from "@/lib/types";

type Layout = "grid" | "list";
type Filters = { maxBudget: string; studyLevel: string; gender: string; pets: string; smoking: string; drinking: string; instruments: string };

const EMPTY_FILTERS: Filters = { maxBudget: "", studyLevel: "", gender: "", pets: "", smoking: "", drinking: "", instruments: "" };

export default function Page() {
  const posts = DEMO_HOUSESHARE_POSTS;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>("grid");
  const [columns, setColumns] = useState<2 | 3 | 4>(3);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const filteredPosts = useMemo(() => posts.filter((post) => {
    const text = `${post.apartment_name} ${post.name} ${post.areas.join(" ")}`.toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (filters.maxBudget && post.budget > Number(filters.maxBudget)) return false;
    if (filters.studyLevel && post.prefs.study_level !== filters.studyLevel) return false;
    if (filters.gender && post.prefs.gender !== filters.gender) return false;
    if (filters.pets && String(Boolean(post.prefs.pets)) !== filters.pets) return false;
    if (filters.smoking && String(Boolean(post.prefs.smoking)) !== filters.smoking) return false;
    if (filters.drinking && post.prefs.drinking !== filters.drinking) return false;
    if (filters.instruments && String(Boolean(post.prefs.instruments)) !== filters.instruments) return false;
    return true;
  }), [posts, search, filters]);

  const gridClass = layout === "list"
    ? "mx-auto grid max-w-3xl grid-cols-1 gap-4"
    : `grid gap-4 ${columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`;

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="mx-auto max-w-screen-2xl px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Sparkles className="size-3.5" /> Student-to-student</p>
          <h1 className="text-2xl font-bold tracking-tight">Find your house share</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Find a home and housemates that suit you.</p>
        </div>
        <Button type="button" disabled title="Post creation is coming soon" className="h-10">Create post</Button>
      </header>

      <p className="mb-5 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-xs text-muted-foreground">
        Demo posts use real London residential areas. The households and availability are illustrative, not verified listings.
      </p>

      <div className="mb-5 flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="House Share views">
        <button type="button" role="tab" aria-selected="true" className="min-h-10 flex-1 rounded-lg bg-background px-2 text-sm font-semibold text-foreground shadow-sm">Explore</button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border bg-background px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apartments, hosts or areas…" aria-label="Search House Share posts" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <Button type="button" variant="outline" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className="h-11 gap-2">
          <SlidersHorizontal className="size-4" /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
        </Button>
      </div>

      {filtersOpen && (
        <Card className="mb-4">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-xs font-medium">Max budget (£)<input type="number" min="0" value={filters.maxBudget} onChange={(event) => updateFilter("maxBudget", event.target.value)} placeholder="Any budget" className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" /></label>
            <label className="space-y-1 text-xs font-medium">Study level<select value={filters.studyLevel} onChange={(event) => updateFilter("studyLevel", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"><option value="">Any</option><option value="undergrad">Undergraduate</option><option value="postgrad">Postgraduate</option></select></label>
            <label className="space-y-1 text-xs font-medium">Gender preference<select value={filters.gender} onChange={(event) => updateFilter("gender", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"><option value="">Any</option><option value="women">Women</option><option value="men">Men</option><option value="mixed">Mixed</option></select></label>
            <label className="space-y-1 text-xs font-medium">Pets<select value={filters.pets} onChange={(event) => updateFilter("pets", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"><option value="">Any</option><option value="true">Allowed</option><option value="false">Not allowed</option></select></label>
            <label className="space-y-1 text-xs font-medium">Smoking<select value={filters.smoking} onChange={(event) => updateFilter("smoking", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"><option value="">Any</option><option value="true">Allowed</option><option value="false">Not allowed</option></select></label>
            <label className="space-y-1 text-xs font-medium">Drinking preference<select value={filters.drinking} onChange={(event) => updateFilter("drinking", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"><option value="">Any</option><option value="none">No drinking</option><option value="sometimes">Sometimes</option><option value="often">Often</option></select></label>
            <label className="space-y-1 text-xs font-medium">Musical instruments<select value={filters.instruments} onChange={(event) => updateFilter("instruments", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"><option value="">Any</option><option value="true">Allowed</option><option value="false">Not allowed</option></select></label>
            {activeFilterCount > 0 && <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-left text-xs font-semibold text-primary hover:underline sm:col-span-2 lg:col-span-5">Clear filters</button>}
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{filteredPosts.length} house {filteredPosts.length === 1 ? "share" : "shares"}</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="House Share layout">
            <button type="button" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium", layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutGrid className="size-3.5" /> Grid</button>
            <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium", layout === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}><List className="size-3.5" /> List</button>
          </div>
          {layout === "grid" && <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="Grid columns">{([2, 3, 4] as const).map((count) => <button key={count} type="button" aria-label={`${count} columns`} aria-pressed={columns === count} onClick={() => setColumns(count)} className={cn("size-8 rounded-md text-xs font-medium", columns === count ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>{count}</button>)}</div>}
        </div>
      </div>

      {filteredPosts.length ? (
        <div className={gridClass}>{filteredPosts.map((post) => <HouseShareCard key={post.id} post={post} />)}</div>
      ) : (
        <Card className="border-dashed shadow-none"><CardContent className="flex min-h-44 flex-col items-center justify-center px-6 text-center"><span className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="size-5" /></span><p className="font-semibold">{search || activeFilterCount ? "No house shares match those filters" : "No House Share posts yet"}</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{search || activeFilterCount ? "Try changing your search or clearing a filter." : "New student posts will appear here when they’re available."}</p></CardContent></Card>
      )}
    </main>
  );
}

function HouseShareCard({ post }: { post: HouseSharePost }) {
  const currentTenants = post.total_tenants - post.looking_for_n;
  const preferenceLabels = [
    post.prefs.study_level && (post.prefs.study_level === "postgrad" ? "Postgraduate" : "Undergraduate"),
    post.prefs.gender && `${post.prefs.gender} household`,
    post.prefs.pets ? "Pets welcome" : "No pets",
    post.prefs.smoking ? "Smoking allowed" : "Non-smoking",
    post.prefs.drinking && `Drinking: ${post.prefs.drinking}`,
    post.prefs.instruments ? "Instruments welcome" : "No instruments",
    post.prefs.parties ? "Parties welcome" : "Quiet household",
  ].filter(Boolean) as string[];

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex aspect-[1.45] flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/15 via-amber-50 to-rose-100 text-primary">
        <span className="flex size-20 items-center justify-center rounded-full border-4 border-white/80 bg-white/80 text-2xl font-bold shadow-sm">{post.name.slice(0, 1).toUpperCase()}</span>
        <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-foreground">{currentTenants} current · {post.total_tenants} total</span>
      </div>
      <div className="space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h2 className="truncate font-semibold leading-snug">{post.apartment_name}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">Hosted by {post.name}</p><p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" />{post.areas.length ? post.areas.join(", ") : "Area flexible"}</p></div>
          <p className="shrink-0 text-right text-sm font-bold">£{post.budget}<span className="font-normal text-muted-foreground"> / wk budget</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Users className="size-3" /> Seeking {post.looking_for_n} {post.looking_for_n === 1 ? "tenant" : "tenants"}</span>{post.move_in && <span>Move in {new Date(post.move_in).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>}</div>
        <div className="flex flex-wrap gap-1.5">{preferenceLabels.length ? preferenceLabels.map((label) => <Badge key={label} variant="secondary" className="text-[10px]">{label}</Badge>) : <Badge variant="secondary" className="text-[10px]">Preferences flexible</Badge>}</div>
        <Link href={`/houseshare/chat/${post.id}`} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"><MessageCircle className="size-4" />Chat with {post.name}</Link>
      </div>
    </article>
  );
}
