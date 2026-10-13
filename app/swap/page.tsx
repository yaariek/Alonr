import { PlaceholderPage } from "@/components/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Room swaps"
      owner="Person B"
      todo={[
        "Browse swap / contract-release listings",
        "Mutual match badge (match_listings RPC)",
        "My listings",
      ]}
    />
  );
}
