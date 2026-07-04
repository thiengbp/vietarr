import { AppHeader } from "@/components/AppHeader";
import { DiscoverClient } from "./DiscoverClient";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  return (
    <>
      <AppHeader active="discover" />
      <DiscoverClient />
    </>
  );
}
