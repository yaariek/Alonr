import { Suspense } from "react";
import DemoHouseShareChat from "./demo-chat";

// params is request-time data: with cacheComponents it must be read inside <Suspense>.
async function Chat({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return <DemoHouseShareChat postId={postId} />;
}

export default function Page({ params }: { params: Promise<{ postId: string }> }) {
  return (
    <Suspense>
      <Chat params={params} />
    </Suspense>
  );
}
