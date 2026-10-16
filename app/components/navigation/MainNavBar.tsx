import { auth } from "@/auth";
import { adminNavGroups } from "@/app/lib/adminNavigation";
import { filterNavGroups, type NavGroup } from "@/app/lib/navigation";
import type { AccessUser } from "@/app/lib/routeAccess";
import { NavLinks } from "./NavLinks";

// At the moment we only have admin menu
function getNavGroups(user: AccessUser): NavGroup[] {
    if (user.isAdmin) return adminNavGroups;
    return [];
}

export async function MainNavBar() {
    const session = await auth();
    if (!session?.user) return null;

    const groups = filterNavGroups(getNavGroups(session.user), session.user);
    if (groups.length === 0) return null;

    return (
        <nav aria-label="Main navigation" className="relative z-50 w-full border-b border-gray-200 px-6 sm:px-12 py-2">
            <NavLinks groups={groups} />
        </nav>
    );
}
