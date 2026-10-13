import { auth } from "@/auth";
import DigitalForm from "../components/forms/digitalForm";

export const metadata = {
    title: "Register your exam",
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) return;
    return (
        <main>
            <DigitalForm user={session.user}/>
        </main>
    )
}
