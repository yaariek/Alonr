"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "@/components/chat/person-avatar";
import {
  clockTime, dayLabel, getConversation, getMessages, mergeMessage, sendMessage, subscribeToMessages,
  type Conversation, type Message,
} from "@/lib/data/chat";
import { roomKindLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-found" }
  | { status: "ready"; me: string; conversation: Conversation };

/** One conversation: messages (live via Supabase Realtime) and a send box. */
export function ChatRoom({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let stop = () => {};
    (async () => {
      const { data } = await supabase.auth.getUser();
      const me = data.user?.id;
      if (cancelled) return;
      if (!me) return setState({ status: "signed-out" });
      const conversation = await getConversation(supabase, id);
      if (cancelled) return;
      if (!conversation) return setState({ status: "not-found" });
      // Listen first, then load, so no message slips through in between
      stop = subscribeToMessages(supabase, (m) => setMessages((list) => mergeMessage(list, m)), id);
      const loaded = await getMessages(supabase, id).catch(() => [] as Message[]);
      if (cancelled) return;
      setMessages((list) => loaded.reduce(mergeMessage, list));
      setState({ status: "ready", me, conversation });
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, state.status]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const m = await sendMessage(createClient(), id, text);
      setMessages((list) => mergeMessage(list, m));
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (state.status === "loading") {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chat…</div>;
  }
  if (state.status !== "ready") {
    const signedOut = state.status === "signed-out";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">{signedOut ? "Sign in to see this chat" : "Chat not found"}</p>
        <Link
          href={signedOut ? `/login?next=/messages/${id}` : "/messages"}
          className={buttonVariants({ className: "h-10 w-full max-w-xs" })}
        >
          {signedOut ? "Sign in" : "Back to chats"}
        </Link>
      </div>
    );
  }

  const { me, conversation: c } = state;
  const listing = c.listing;

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="flex items-center gap-3 border-b bg-background px-2 py-2">
        <Link href="/messages" aria-label="Back to chats" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="size-5" />
        </Link>
        <PersonAvatar id={c.other.id} name={c.other.name} className="size-9 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{c.other.name}</p>
          {listing && (
            // TODO: link to /listings/<id> once B's listing page exists
            <Link href={`/property/${listing.propertyId}`} className="block truncate text-xs text-muted-foreground hover:underline">
              {listing.ownerId === me ? "Your listing" : "Their listing"}: {listing.propertyName} ·{" "}
              {roomKindLabel(listing.roomKind)} · £{listing.priceWeek}/wk
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="mx-auto mt-8 max-w-xs text-center text-sm text-muted-foreground">
            Say hi to {c.other.name}
            {listing ? ` about ${listing.ownerId === me ? "your" : "their"} room at ${listing.propertyName}` : ""}.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === me;
          const prev = messages[i - 1];
          const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
          const sameSender = prev && !newDay && prev.senderId === m.senderId;
          return (
            <div key={m.id}>
              {newDay && (
                <p className="my-3 text-center text-xs font-medium text-muted-foreground">{dayLabel(m.createdAt)}</p>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start", sameSender ? "mt-0.5" : "mt-2")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                  )}
                >
                  {m.body}
                  <span className={cn("ml-2 align-bottom text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {clockTime(m.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t bg-background p-2">
        {error && <p role="alert" className="px-1 pb-1 text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Input
            aria-label="Message"
            placeholder="Message"
            autoComplete="off"
            className="h-10 rounded-full px-4"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full" disabled={!text.trim() || sending} aria-label="Send">
            <SendHorizontal className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
