/** Matches data/enrich.py's slugify so photo names line up with properties.csv and seed.py. */
export function propertyImageSlug(name: string): string {
  if (name === "The Stay Club") return "stay-club-north-acton";
  if (name === "Stay Club") return "stay-club-camden";

  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function propertyImagePath(name: string): string {
  return `/images/halls/${propertyImageSlug(name)}.jpg`;
}
