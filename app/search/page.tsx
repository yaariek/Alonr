import { redirect } from "next/navigation";

export default function SearchPage() {
  redirect("/listings?view=halls");
}
