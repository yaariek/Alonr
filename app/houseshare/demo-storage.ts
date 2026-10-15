import type { HouseSharePost } from "@/lib/types";

const STORAGE_KEY = "alonr.demo-house-share-posts.v1";
const CHANGE_EVENT = "alonr:house-share-posts-changed";
export const EMPTY_LOCAL_HOUSESHARE_POSTS: HouseSharePost[] = [];
let cachedRaw: string | null | undefined;
let cachedPosts = EMPTY_LOCAL_HOUSESHARE_POSTS;

function isHouseSharePost(value: unknown): value is HouseSharePost {
  if (!value || typeof value !== "object") return false;
  const post = value as Partial<HouseSharePost>;
  return typeof post.id === "string" &&
    typeof post.user_id === "string" &&
    typeof post.name === "string" &&
    typeof post.apartment_name === "string" &&
    typeof post.budget === "number" &&
    Array.isArray(post.areas) &&
    typeof post.move_in === "string" &&
    typeof post.looking_for_n === "number" &&
    typeof post.total_tenants === "number" &&
    Boolean(post.prefs && typeof post.prefs === "object");
}

export function getLocalHouseSharePosts(): HouseSharePost[] {
  if (typeof window === "undefined") return EMPTY_LOCAL_HOUSESHARE_POSTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedPosts;
    cachedRaw = raw;
    const saved = JSON.parse(raw ?? "[]") as unknown;
    cachedPosts = Array.isArray(saved) ? saved.filter(isHouseSharePost) : EMPTY_LOCAL_HOUSESHARE_POSTS;
    return cachedPosts;
  } catch {
    cachedRaw = undefined;
    cachedPosts = EMPTY_LOCAL_HOUSESHARE_POSTS;
    return cachedPosts;
  }
}

export function saveLocalHouseSharePost(post: HouseSharePost) {
  const posts = [post, ...getLocalHouseSharePosts().filter((saved) => saved.id !== post.id)];
  const raw = JSON.stringify(posts);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedPosts = posts;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeLocalHouseSharePosts(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
