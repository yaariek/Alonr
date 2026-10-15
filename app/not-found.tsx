import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Shown for any unknown URL, and when a hall or listing doesn't exist (notFound()).
export default function NotFound() {
  return (
    <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted">
        <MapPinOff className="size-7 text-muted-foreground" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="text-sm text-muted-foreground">
        The link may be old, or the room may have been taken down.
      </p>
      <div className="mt-2 flex w-full flex-col gap-2">
        <Link href="/map" className={buttonVariants({ className: "h-10 w-full" })}>
          Back to the map
        </Link>
        <Link href="/listings" className={buttonVariants({ variant: "outline", className: "h-10 w-full" })}>
          Browse listings
        </Link>
      </div>
    </div>
  );
}
