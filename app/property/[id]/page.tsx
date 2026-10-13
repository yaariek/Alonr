import { Suspense } from "react";
import { PlaceholderPage } from "@/components/placeholder-page";

// params is request-time data: with cacheComponents it must be read inside <Suspense>.
async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlaceholderPage
      title={`Property ${id}`}
      owner="Person A"
      todo={["Prices + room types", "Facilities, nearest supermarket/station", "Active swap listings here"]}
    />
  );
}

export default function Page(props: PageProps<"/property/[id]">) {
  return (
    <Suspense>
      <PropertyDetail params={props.params} />
    </Suspense>
  );
}
