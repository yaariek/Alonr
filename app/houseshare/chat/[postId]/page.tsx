import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DEMO_HOUSESHARE_POSTS } from "../../demo-data";
import DemoHouseShareChat from "./demo-chat";

// params is request-time data: with cacheComponents it must be read inside <Suspense>.
async function Chat({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = DEMO_HOUSESHARE_POSTS.find((item) => item.id === postId);
  if (!post) notFound();

  return <DemoHouseShareChat apartmentName={post.apartment_name} hostName={post.name} />;
}

export default function Page({ params }: { params: Promise<{ postId: string }> }) {
  return (
    <Suspense>
      <Chat params={params} />
    </Suspense>
  );
}
