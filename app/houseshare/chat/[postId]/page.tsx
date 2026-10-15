import { notFound } from "next/navigation";
import { DEMO_HOUSESHARE_POSTS } from "../../demo-data";
import DemoHouseShareChat from "./demo-chat";

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = DEMO_HOUSESHARE_POSTS.find((item) => item.id === postId);
  if (!post) notFound();

  return <DemoHouseShareChat apartmentName={post.apartment_name} hostName={post.name} />;
}
