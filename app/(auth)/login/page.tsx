import { PlaceholderPage } from "@/components/placeholder-page";

export default function Page() {
  return (
    <PlaceholderPage
      title="Sign in"
      owner="Person B"
      todo={[
        "Uni email (.ac.uk) + 6-digit OTP via Supabase Auth",
        "Demo login button for judges",
      ]}
    />
  );
}
