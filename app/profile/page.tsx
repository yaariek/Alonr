import { PlaceholderPage } from "@/components/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="My profile"
      owner="Person B"
      todo={[
        "Uni, course, languages, lifestyle prefs",
        "Sign out",
      ]}
    />
  );
}
