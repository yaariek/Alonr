import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility, ArrowLeft, Bike, Calendar, Clock, ExternalLink, GraduationCap, MapPin, Repeat,
  ShoppingCart, TrainFront, Users, Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROPERTY_SELECT, toProperty, type PropertyRow } from "@/lib/data/properties";
import { formatDate, formatDistance, formatWeeks, roomKindLabel, walkTime } from "@/lib/format";
import { PROVIDER_COLOURS } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";

// params is request-time data: with cacheComponents it must be read inside <Suspense>.
async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: row }, { data: listings }] = await Promise.all([
    supabase.from("properties").select(`${PROPERTY_SELECT}, universities(name)`).eq("id", id).maybeSingle(),
    supabase.from("listings").select("*").eq("property_id", id).eq("status", "active").order("created_at", { ascending: false }),
  ]);
  // An unknown or malformed id (not a uuid) comes back as no row
  const p = row ? toProperty(row as PropertyRow) : null;
  if (!row || !p) notFound();
  const university = (row as { universities: { name: string } | null }).universities?.name;

  const features = [
    p.catered && { icon: Utensils, label: "Catered" },
    p.reception24h && { icon: Clock, label: "24/7 reception" },
    p.accessible && { icon: Accessibility, label: "Accessible" },
  ].filter(Boolean) as { icon: typeof Utensils; label: string }[];

  const nearby = [
    p.supermarketM !== undefined && { icon: ShoppingCart, label: p.supermarketName ?? "Supermarket", m: p.supermarketM },
    p.stationM !== undefined && { icon: TrainFront, label: p.stationName ?? "Station", m: p.stationM },
    p.bikeDockM !== undefined && { icon: Bike, label: "Santander Cycles dock", m: p.bikeDockM },
  ].filter(Boolean) as { icon: typeof Bike; label: string; m: number }[];

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-8">
      <Link href="/map" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 gap-1" })}>
        <ArrowLeft className="size-4" /> Map
      </Link>

      <header className="space-y-2">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: PROVIDER_COLOURS[p.provider] }}
        >
          {p.provider}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
        {(p.address || p.postcode) && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {[p.address, p.postcode].filter(Boolean).join(", ")}
          </p>
        )}
        {university && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <GraduationCap className="size-4 shrink-0" /> {university} hall
          </p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Rooms &amp; prices</CardTitle>
        </CardHeader>
        <CardContent>
          {p.roomTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Prices coming soon.</p>
          ) : (
            <ul className="divide-y">
              {p.roomTypes.map((r) => (
                <li key={r.kind} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{roomKindLabel(r.kind)}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.flatmates > 0 && `${r.flatmates} flatmates`, formatWeeks(r.contractWeeks)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="text-lg font-semibold">£{r.priceWeek}</span>
                    <span className="text-xs text-muted-foreground">/wk</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(features.length > 0 || p.facilities.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Facilities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {features.map(({ icon: Icon, label }) => (
              <Badge key={label}>
                <Icon /> {label}
              </Badge>
            ))}
            {p.facilities.map((f) => (
              <Badge key={f} variant="secondary" className="capitalize">
                {f}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {nearby.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nearby</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nearby.map(({ icon: Icon, label, m }) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <span className="shrink-0 text-right text-muted-foreground">
                    {formatDistance(m)} · {walkTime(m)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="size-4" /> Swaps &amp; contract releases
            {!!listings?.length && <Badge variant="secondary">{listings.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!listings?.length && <p className="text-sm text-muted-foreground">Nobody has listed a room here yet.</p>}
          {listings?.map((l) => (
            // TODO(B): link each listing to /swap/<id> once that page exists
            <div key={l.id} className="space-y-1.5 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={l.kind === "swap" ? "default" : "outline"}>
                  {l.kind === "swap" ? "Swap" : "Contract release"}
                </Badge>
                <span className="font-semibold">
                  £{l.price_week}
                  <span className="text-xs font-normal text-muted-foreground">/wk</span>
                </span>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{roomKindLabel(l.room_kind)}</span>
                {l.flatmates !== null && l.flatmates > 0 && (
                  <span className="inline-flex items-center gap-1"><Users className="size-3" /> {l.flatmates} flatmates</span>
                )}
                {l.start_date && l.end_date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" /> {formatDate(l.start_date)} – {formatDate(l.end_date)}
                  </span>
                )}
              </p>
              {l.description && <p className="text-sm">{l.description}</p>}
            </div>
          ))}
          <Link href="/swap/new" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Live here? List your room
          </Link>
        </CardContent>
      </Card>

      {p.website && (
        <a
          href={p.website}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ className: "h-10 w-full gap-2" })}
        >
          Visit website <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function Page(props: PageProps<"/property/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <PropertyDetail params={props.params} />
    </Suspense>
  );
}
