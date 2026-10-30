import { auth } from "../../auth"
import Calendar from "../components/crep/calendar/FullCalendar"
import { Footer } from "../components/Footer"
import { NavBar } from "../components/NavBar"

export const metadata = {
  title: "CREP - Calendar",
}

export default async function Home() {
  const session = await auth()
  if (!session?.user) return
  return (
    <>
      <div className="font-sans grid grid-rows items-center justify-items-center px-6 sm:px-12 gap-8 pt-8 sm:pb-0">
        <div className="header w-full">
          <NavBar user={session?.user} />
        </div>
        <div className="calendar w-full">
          <Calendar user={session?.user} />
        </div>
        <Footer />
      </div>
    </>
  )
}
