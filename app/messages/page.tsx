import { ConversationList } from "@/components/chat/conversation-list";
import { PageHeading } from "@/components/page-heading";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-8">
      <PageHeading title="Chats" tagline="Connect directly with students about their rooms." className="mb-4" />
      <ConversationList />
    </div>
  );
}
