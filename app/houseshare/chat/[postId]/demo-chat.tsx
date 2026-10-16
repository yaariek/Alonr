"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { formatDate } from "@/lib/format";
import { DEMO_HOUSESHARE_POSTS } from "../../demo-data";
import { getLocalHouseSharePosts, subscribeLocalHouseSharePosts } from "../../demo-storage";
import { PageHeading } from "@/components/page-heading";

type Message = { id: number; sender: "you" | "host"; text: string };

export default function DemoHouseShareChat({ postId }: { postId: string }) {
  const post = useSyncExternalStore(
    subscribeLocalHouseSharePosts,
    () => [...getLocalHouseSharePosts(), ...DEMO_HOUSESHARE_POSTS].find((item) => item.id === postId) ?? null,
    () => DEMO_HOUSESHARE_POSTS.find((item) => item.id === postId) ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const openingMessages: Message[] = post ? [
      { id: 1, sender: "host", text: `Hi! Thanks for your interest in ${post.apartment_name}. What would you like to know?` },
      { id: 2, sender: "you", text: "Hi! Is the room still available?" },
      // A believable reply built from the post; the banner above still says the chat is a demo.
      { id: 3, sender: "host", text: `Yes, it is! We have ${post.looking_for_n === 1 ? "one room" : `${post.looking_for_n} rooms`} free from ${formatDate(post.move_in)}, around £${post.budget}/week. Happy to set up a viewing if you'd like to come round.` },
    ] : [];

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: Date.now(), sender: "you", text }]);
    setDraft("");
  }

  if (!post) return <div className="mx-auto max-w-2xl px-4 py-8"><PageHeading title="House Share chat" tagline="Good homes start with good conversations." className="mb-5" /><p className="mb-3 text-sm text-muted-foreground">This House Share post could not be found in this browser.</p><Link href="/houseshare" className="text-sm font-medium text-primary hover:underline">Back to House Share</Link></div>;

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-5 sm:px-6">
      <Link href="/houseshare" className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to House Share</Link>
      <PageHeading title="House Share chat" tagline="Good homes start with good conversations." className="mb-4" />
      <section className="flex min-h-[70dvh] flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="border-b px-4 py-4">
          <p className="font-semibold">{post.name}</p>
          <p className="text-sm text-muted-foreground">{post.apartment_name}</p>
        </header>
        <p className="border-b bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">Demo conversation · messages stay in this browser and aren’t sent</p>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {[...openingMessages, ...messages].map((message) => (
            <div key={message.id} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${message.sender === "you" ? "ml-auto rounded-br-md bg-primary text-primary-foreground" : "mr-auto rounded-bl-md bg-muted text-foreground"}`}>
              {message.text}
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${post.name} (demo only)`} aria-label="Demo message" className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button type="submit" aria-label="Add demo message" disabled={!draft.trim()} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button>
        </form>
      </section>
    </div>
  );
}
