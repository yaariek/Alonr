import Image from "next/image";
import Link from "next/link";

export function AppBrandHeader() {
  return (
    <header className="z-30 shrink-0 border-b bg-background">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-2 sm:px-6">
        <Link href="/map" aria-label="alonr home" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Image src="/alonr-logo.jpeg" alt="" width={40} height={40} priority className="size-9 rounded-lg object-cover" />
          <span className="text-lg font-bold tracking-tight">alonr</span>
        </Link>
        <span className="h-7 border-l" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Student to student</p>
      </div>
    </header>
  );
}
