import { auth } from "@/auth";
import DiffRegisterForm from "../components/forms/diffExamForm"

export const metadata = {
    title: "Register for diff exam",
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) return;
    return (
        <main>
            <DiffRegisterForm user={session.user}/>
        </main>
    )
}
