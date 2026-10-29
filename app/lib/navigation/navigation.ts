import type { NavIconName } from "@/app/lib/navigation/navIcons";
import { canAccessRoute, type AccessUser } from "@/app/lib/auth/routeAccess";

export interface NavLink {
    label: string;
    url: string;
    icon: NavIconName;
}

export interface NavGroup {
    label: string;
    links: NavLink[];
}

// Keeps only the links the user can open
export function filterNavGroups(groups: NavGroup[], user: AccessUser): NavGroup[] {
    return groups
        .map(group => ({ ...group, links: group.links.filter(link => canAccessRoute(user, link.url)) }))
        .filter(group => group.links.length > 0);
}
