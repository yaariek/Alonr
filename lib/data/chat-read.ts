"use client";

import type { ReadTimes } from "@/lib/data/chat";

// When I last opened each chat, remembered in this browser (per signed-in user).
// Simple on purpose: no database table, so reading a chat on one device doesn't clear it on another.

const key = (userId: string) => `alonr.chat-read.v1:${userId}`;
export const CHAT_READ_EVENT = "alonr:chat-read";

export function getReadTimes(userId: string): ReadTimes {
  try {
    return JSON.parse(window.localStorage.getItem(key(userId)) ?? "{}") as ReadTimes;
  } catch {
    return {};
  }
}

/** Mark a chat read up to `at` (the newest message I've seen). Tells the Chats tab badge to update. */
export function markChatRead(userId: string, conversationId: string, at: string) {
  const reads = getReadTimes(userId);
  if (reads[conversationId] && reads[conversationId] >= at) return;
  reads[conversationId] = at;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(reads));
  } catch {
    // storage blocked (private mode): the badge just won't remember
  }
  window.dispatchEvent(new Event(CHAT_READ_EVENT));
}
