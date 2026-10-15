import { Suspense } from "react";
import { ListingsPage } from "@/components/listings/listings-page";

// Suspense: ListingsPage reads ?view= (request-time data, see AGENTS.md "Next.js 16 gotchas").
export default function Page() {
  return (
    <Suspense>
      <ListingsPage />
    </Suspense>
  );
}
