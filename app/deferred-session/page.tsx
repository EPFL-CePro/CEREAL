import { auth } from "@/auth"

export const metadata = {
  title: "CEREAL - Deferred session",
}

export default async function Page() {
  const session = await auth()
  if (!session?.user) return

  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Deferred session tracking</h1>
    </main>
  )
}
