import { auth } from "@/auth"

import RegisterForm from "../components/forms/TeachersExamForm"

export const metadata = {
  title: "Register your exam",
}

export default async function Page() {
  const session = await auth()
  if (!session?.user) return
  return (
    <main>
      <RegisterForm user={session.user} />
    </main>
  )
}
