import { AppHeader } from "@/components/AppHeader";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <>
      <AppHeader active="admin" />
      <AdminClient />
    </>
  );
}
