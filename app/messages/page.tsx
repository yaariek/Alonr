import { ConversationList } from "@/components/chat/conversation-list";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Chats</h1>
      <ConversationList />
    </div>
  );
}
