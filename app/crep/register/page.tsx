import { auth } from "@/auth";
import RegisterForm from "../../components/crep/register"

export const metadata = {
    title: "CREP - Register",
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) return;
    return (
        <main>
            <RegisterForm user={session.user}/>
        </main>
    )
}
