import { PlaceholderPage } from "@/components/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="New listing"
      owner="Person B"
      todo={[
        "I have: property, room kind, price, dates",
        "I want: areas, properties, room kinds, max price",
      ]}
    />
  );
}
