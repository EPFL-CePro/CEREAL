import { hasPermission, type Permission } from "@/app/lib/auth/route-access"
import { auth } from "@/auth"

export async function requirePermission(permission: Permission) {
  const session = await auth()

  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  if (!hasPermission(session.user, permission)) {
    throw new Error("Forbidden")
  }

  return session.user
}
