import { redirect } from "next/navigation"
import { AdminView } from "@/components/admin/admin-view"
import { PULSO_ADMIN_ENABLED } from "@/lib/features"

export default function AdminPage() {
  if (!PULSO_ADMIN_ENABLED) redirect("/prospectos")

  return <AdminView />
}
