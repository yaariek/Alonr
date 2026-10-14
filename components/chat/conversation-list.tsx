"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PersonAvatar } from "@/components/chat/person-avatar";
import { chatTime, getConversations, subscribeToMessages, type Conversation } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/client";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "ready"; me: string; conversations: Conversation[]; error?: string };

/** "Chats" tab: my conversations, newest activity first, refreshed live when a message arrives. */
export function ConversationList() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getUser();
      const me = data.user?.id;
      if (cancelled) return;
      if (!me) return setState({ status: "signed-out" });
      try {
        const conversations = await getConversations(supabase);
        if (!cancelled) setState({ status: "ready", me, conversations });
      } catch (e) {
        if (!cancelled) setState({ status: "ready", me, conversations: [], error: (e as Error).message });
      }
    }
    load();
    const stop = subscribeToMessages(supabase, () => load());
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  if (state.status === "loading") {
    return (
      <ul className="divide-y">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <span className="size-11 animate-pulse rounded-full bg-muted" />
            <span className="h-10 flex-1 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  if (state.status === "signed-out") {
    return (
      <Empty title="Sign in to chat" text="Message other students about their rooms once you're signed in.">
        <Link href="/login?next=/messages" className={buttonVariants({ className: "h-10 w-full max-w-xs" })}>
          Sign in
        </Link>
      </Empty>
    );
  }

  if (state.error) return <p role="alert" className="py-8 text-center text-sm text-destructive">{state.error}</p>;

  if (state.conversations.length === 0) {
    return (
      <Empty title="No chats yet" text='Open a listing and tap "Message" to ask about the room.'>
        <Link href="/listings" className={buttonVariants({ variant: "outline", className: "h-10 w-full max-w-xs" })}>
          Browse listings
        </Link>
      </Empty>
    );
  }

  return (
    <ul className="divide-y">
      {state.conversations.map((c) => {
        const last = c.lastMessage;
        return (
          <li key={c.id}>
            <Link href={`/messages/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted/60">
              <PersonAvatar id={c.other.id} name={c.other.name} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{c.other.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{chatTime(c.updatedAt)}</span>
                </span>
                {c.listing && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.listing.propertyName} · {c.listing.kind === "swap" ? "Swap" : "Contract release"}
                  </span>
                )}
                <span className="block truncate text-sm text-muted-foreground">
                  {last ? `${last.senderId === state.me ? "You: " : ""}${last.body}` : "No messages yet"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="size-6 text-muted-foreground" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}
