"use client";

import { useEffect, useState } from "react";
import { getConversations, subscribeToMessages, unreadCount, type Conversation } from "@/lib/data/chat";
import { CHAT_READ_EVENT, getReadTimes } from "@/lib/data/chat-read";
import { createClient } from "@/lib/supabase/client";

/**
 * For the Chats tab badge: how many of my chats have a reply I haven't opened yet.
 * 0 when signed out. Updates live (Realtime), when a chat is opened, and every 30 s as a backup.
 */
export function useUnreadChats(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient();
    let cancelled = false;
    let stop = () => {};
    let me: string | null = null;
    let conversations: Conversation[] = [];
    let run = 0; // ignore a start() that a newer one has replaced

    const recount = () => {
      if (!cancelled) setCount(me ? unreadCount(conversations, me, getReadTimes(me)) : 0);
    };

    async function refresh() {
      if (!me) return;
      try {
        conversations = await getConversations(supabase);
        recount();
      } catch {
        // offline: keep the last count
      }
    }

    async function start() {
      const mine = ++run;
      stop();
      stop = () => {};
      const { data } = await supabase.auth.getUser();
      if (cancelled || mine !== run) return;
      me = data.user?.id ?? null;
      conversations = [];
      recount();
      if (!me) return;
      refresh();
      stop = subscribeToMessages(supabase, () => refresh(), undefined, () => refresh());
    }

    start();
    const { data: auth } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") start();
    });
    const onRead = () => recount(); // a chat was opened: no need to refetch
    window.addEventListener(CHAT_READ_EVENT, onRead);
    window.addEventListener("storage", onRead);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    return () => {
      cancelled = true;
      stop();
      auth.subscription.unsubscribe();
      window.removeEventListener(CHAT_READ_EVENT, onRead);
      window.removeEventListener("storage", onRead);
      clearInterval(timer);
    };
  }, []);

  return count;
}
