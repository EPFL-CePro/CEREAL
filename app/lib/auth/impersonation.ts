"use server"

import { redirect } from "next/navigation"

import { auth, unstable_update } from "@/auth"

type ImpersonationRole = "sac" | "crep" | "none"

// While impersonating, session.user.isAdmin is false, but session.user.impersonating is only set for real admins.
const isRealAdmin = async () => {
  const session = await auth()
  return Boolean(session?.user.isAdmin || session?.user.impersonating)
}

export async function startImpersonation(role: ImpersonationRole) {
  if (!(await isRealAdmin())) return
  await unstable_update({ user: { impersonating: role } })
  redirect("/")
}

export async function stopImpersonation() {
  if (!(await isRealAdmin())) return
  await unstable_update({ user: { impersonating: null } })
  redirect("/admin")
}
