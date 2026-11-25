import { auth } from "@/auth"

import AdminSettings from "../components/admin/AdminSettings"

export const metadata = {
  title: "CEREAL - Admin",
}

export default async function Page() {
  const session = await auth()
  if (!session?.user) return
  return <AdminSettings />
}
