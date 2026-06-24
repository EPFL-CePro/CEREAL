import { auth } from "@/auth";
import AdminPage from "../components/admin/AdminPage";

export const metadata = {
    title: "CEREAL - Admin",
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) return;
    return (
        <AdminPage />
    )
}
