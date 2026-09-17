import { auth } from "@/auth";
import { SacAbsencesTable } from "../components/sac-absences/SacAbsencesTable";

export const metadata = {
    title: "SAC - Absences",
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) return;

    return (
        <main>
            <SacAbsencesTable />
        </main>
    )
}
