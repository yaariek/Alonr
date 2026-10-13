"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, MessageCircle, Repeat, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/swap", label: "Swap", icon: Repeat },
  { href: "/houseshare", label: "Share", icon: Users },
  { href: "/messages", label: "Chats", icon: MessageCircle },
  { href: "/profile", label: "Me", icon: User },
] as const;

// Wrap in <Suspense fallback={<NavBar pathname="" />}>: usePathname() is request-time data.
export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;
  return <NavBar pathname={pathname} />;
}

export function NavBar({ pathname }: { pathname: string }) {
  return (
    <nav className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname !== "" && pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-xs",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
