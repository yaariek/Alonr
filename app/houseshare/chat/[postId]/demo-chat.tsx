"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";

type Message = { id: number; sender: "you" | "host"; text: string };

export default function DemoHouseShareChat({ apartmentName, hostName }: { apartmentName: string; hostName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "host", text: `Hi! Thanks for your interest in ${apartmentName}. What would you like to know?` },
    { id: 2, sender: "you", text: "Hi! Is the room still available?" },
    { id: 3, sender: "host", text: "This is a demo chat. A real host can reply once messaging is connected." },
  ]);
  const [draft, setDraft] = useState("");

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: Date.now(), sender: "you", text }]);
    setDraft("");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-2xl flex-col px-4 py-5 sm:px-6">
      <Link href="/houseshare" className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to House Share</Link>
      <section className="flex min-h-[70dvh] flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="border-b px-4 py-4">
          <p className="font-semibold">{hostName}</p>
          <p className="text-sm text-muted-foreground">{apartmentName}</p>
        </header>
        <p className="border-b bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">Demo conversation · messages stay in this browser and aren’t sent</p>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <div key={message.id} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${message.sender === "you" ? "ml-auto rounded-br-md bg-primary text-primary-foreground" : "mr-auto rounded-bl-md bg-muted text-foreground"}`}>
              {message.text}
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${hostName} (demo only)`} aria-label="Demo message" className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button type="submit" aria-label="Add demo message" disabled={!draft.trim()} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button>
        </form>
      </section>
    </main>
  );
}
