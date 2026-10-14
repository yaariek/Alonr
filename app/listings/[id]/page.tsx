import { Suspense } from "react";
import { ListingDetail } from "@/components/listings/listing-detail";

async function DetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}

function Loading() {
  return <div className="mx-auto max-w-lg space-y-4 p-4"><div className="aspect-[1.2] animate-pulse rounded-2xl bg-muted" /><div className="h-8 w-2/3 animate-pulse rounded bg-muted" /><div className="h-24 animate-pulse rounded-xl bg-muted" /></div>;
}

export default function Page(props: PageProps<"/listings/[id]">) {
  return <Suspense fallback={<Loading />}><DetailRoute params={props.params} /></Suspense>;
}
