import { Suspense } from "react";
import { ChatRoom } from "@/components/chat/chat-room";

// params is request-time data: with cacheComponents it must be read inside <Suspense>.
async function Room({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatRoom id={id} />;
}

export default function ChatPage(props: PageProps<"/messages/[id]">) {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chat…</div>}>
      <Room params={props.params} />
    </Suspense>
  );
}
