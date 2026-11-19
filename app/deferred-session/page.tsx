import { auth } from "@/auth"

import { DeferredSessionTracking } from "../components/deferred-session/DeferredSessionTracking"
import { getActiveDeferredSessionTracking } from "../lib/database"

export const metadata = {
  title: "CEREAL - Deferred session",
}

// Always show the current registrations
export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth()
  if (!session?.user) return

  const tracking = await getActiveDeferredSessionTracking()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-semibold">Deferred session tracking</h1>
        {tracking && <p className="text-slate-500">{tracking.name}</p>}
      </div>

      {tracking ? (
        <DeferredSessionTracking tracking={tracking} />
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
          No active deferred session. Activate one in the admin page.
        </p>
      )}
    </main>
  )
}
