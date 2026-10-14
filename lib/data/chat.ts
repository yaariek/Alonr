import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import type { ListingKind, RoomKind } from "@/lib/types";

// Chat: conversations (one per listing + pair of students) and their messages.
// Start a conversation from a listing with startConversation() in lib/data/listings.ts.

type Client = SupabaseClient<Database>;

export interface Message {
  id: number;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  other: { id: string; name: string };
  listing: {
    id: string;
    kind: ListingKind;
    roomKind: RoomKind;
    priceWeek: number;
    propertyId: string;
    propertyName: string;
    ownerId: string;
  } | null; // null once the listing is deleted
  lastMessage: Message | null;
  updatedAt: string; // last message, or when the chat was started
}

const CONVERSATION_SELECT = `id, created_at, user_a, user_b,
  a:profiles!conversations_user_a_fkey(id, display_name),
  b:profiles!conversations_user_b_fkey(id, display_name),
  listings(id, kind, room_kind, price_week, property_id, user_id, properties(name))`;

type ProfileRef = { id: string; display_name: string | null } | null;
type ConversationRow = {
  id: string; created_at: string; user_a: string; user_b: string; a: ProfileRef; b: ProfileRef;
  listings: {
    id: string; kind: ListingKind; room_kind: RoomKind; price_week: number; property_id: string;
    user_id: string; properties: { name: string } | null;
  } | null;
};

// ───────────── Pure helpers (tested in chat.test.ts) ─────────────

export function toMessage(row: Tables<"messages">): Message {
  return { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, body: row.body, createdAt: row.created_at };
}

export function toConversation(row: ConversationRow, me: string, lastMessage: Message | null = null): Conversation {
  const otherRef = row.user_a === me ? row.b : row.a;
  const l = row.listings;
  return {
    id: row.id,
    other: { id: row.user_a === me ? row.user_b : row.user_a, name: otherRef?.display_name || "Student" },
    listing: l && {
      id: l.id, kind: l.kind, roomKind: l.room_kind, priceWeek: Number(l.price_week), propertyId: l.property_id,
      propertyName: l.properties?.name ?? "Unknown hall", ownerId: l.user_id,
    },
    lastMessage,
    updatedAt: lastMessage?.createdAt ?? row.created_at,
  };
}

/** Adds a message (from sending or from Realtime) without duplicates, oldest first. */
export function mergeMessage(list: Message[], m: Message): Message[] {
  if (list.some((x) => x.id === m.id)) return list;
  return [...list, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Time of a message: "14:05" today, "Yesterday", "Mon" this week, else "12 Oct". */
export function chatTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  if (days <= 0) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return DAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Day separator inside a chat: "Today", "Yesterday", "Mon", "2 Oct". */
export function dayLabel(iso: string, now = new Date()): string {
  return dayStart(new Date(iso)) >= dayStart(now) ? "Today" : chatTime(iso, now);
}

/** Clock time for a bubble: "14:05". */
export const clockTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ───────────── Supabase calls ─────────────

async function myId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** My conversations, most recent activity first. Empty when signed out. */
export async function getConversations(supabase: Client): Promise<Conversation[]> {
  const me = await myId(supabase);
  if (!me) return [];
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_SELECT);
  if (error) throw new Error("Couldn't load your chats. Check your connection.");
  const rows = data as unknown as ConversationRow[];
  if (rows.length === 0) return [];

  const { data: msgs } = await supabase
    .from("messages").select("*").in("conversation_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false }).limit(500);
  const last = new Map<string, Message>();
  for (const m of msgs ?? []) if (!last.has(m.conversation_id)) last.set(m.conversation_id, toMessage(m));

  return rows
    .map((r) => toConversation(r, me, last.get(r.id) ?? null))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** One conversation, or null if it doesn't exist or isn't mine. */
export async function getConversation(supabase: Client, id: string): Promise<Conversation | null> {
  const me = await myId(supabase);
  if (!me) return null;
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toConversation(data as unknown as ConversationRow, me);
}

/** Messages in a conversation, oldest first. `after` (an ISO time) fetches only newer ones. */
export async function getMessages(supabase: Client, conversationId: string, after?: string): Promise<Message[]> {
  let q = supabase.from("messages").select("*").eq("conversation_id", conversationId);
  if (after) q = q.gt("created_at", after);
  const { data, error } = await q.order("created_at", { ascending: true }).limit(500);
  if (error) throw new Error("Couldn't load messages.");
  return data.map(toMessage);
}

export async function sendMessage(supabase: Client, conversationId: string, body: string): Promise<Message> {
  const text = body.trim();
  if (!text) throw new Error("Type a message first.");
  const { data, error } = await supabase
    .from("messages").insert({ conversation_id: conversationId, body: text }).select("*").single();
  if (error) throw new Error("Couldn't send. Check your connection and try again.");
  return toMessage(data);
}

/**
 * Live messages via Supabase Realtime. Only messages you're allowed to read arrive (RLS).
 * Pass a conversation id for one chat, or nothing for all my chats (to refresh the list).
 * `onLive` runs each time the live connection is (re)established: fetch anything sent meanwhile.
 * Returns a function that stops listening: call it in your effect's cleanup.
 */
export function subscribeToMessages(
  supabase: Client,
  onMessage: (m: Message) => void,
  conversationId?: string,
  onLive?: () => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId ?? "all"}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT", schema: "public", table: "messages",
        ...(conversationId ? { filter: `conversation_id=eq.${conversationId}` } : {}),
      },
      (payload) => onMessage(toMessage(payload.new as Tables<"messages">)),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onLive?.();
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
