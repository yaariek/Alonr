import { cn } from "@/lib/utils";

const COLOURS = ["#6366f1", "#0891b2", "#16a34a", "#ea580c", "#db2777", "#7c3aed", "#ca8a04", "#0f766e"];

/** Initial in a coloured circle; the colour is fixed per person. */
export function PersonAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  const colour = COLOURS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % COLOURS.length];
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ backgroundColor: colour }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
