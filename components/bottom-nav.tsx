"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Map, MessageCircle, User, Users } from "lucide-react";
import { useUnreadChats } from "@/lib/data/use-unread-chats";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/listings", label: "Swap", icon: ArrowLeftRight },
  { href: "/houseshare", label: "Share", icon: Users },
  { href: "/map", label: "Map", icon: Map },
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
  const unread = useUnreadChats();
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
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {href === "/messages" && unread > 0 && (
                    <span
                      aria-label={`${unread} unread ${unread === 1 ? "chat" : "chats"}`}
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
