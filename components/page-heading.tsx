export function PageHeading({ title, tagline, className = "" }: { title: string; tagline: string; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
    </div>
  );
}
