export interface AccessUser {
	isAdmin?: boolean;
	hasCrepAccess?: boolean;
	hasSACAccess?: boolean;
}

export enum Permission {
	ADMIN = 'admin',
	CREP = 'crep',
	SAC = 'sac',
}

export function hasPermission(user: AccessUser, permission: Permission): boolean {
	// If user is admin, he can access anything.
	if (user.isAdmin) {
		return true;
	}

	switch (permission) {
		case Permission.CREP:
			return Boolean(user.hasCrepAccess);
		case Permission.SAC:
			return Boolean(user.hasSACAccess);
		case Permission.ADMIN:
			return false;
	}
}

interface ProtectedRoute {
	path: string;
	includeSubPages?: boolean; // Protects everything below the path (ex: /admin/users)
	permission: Permission;
}

// Routes that need a permission. Anybody can access to route that doesn't exist here.
const PROTECTED_ROUTES: ProtectedRoute[] = [
	{ path: '/crep', permission: Permission.CREP },
	{ path: '/sac-absences', includeSubPages: true, permission: Permission.SAC },
	{ path: '/admin', includeSubPages: true, permission: Permission.ADMIN },
	{ path: '/exams', includeSubPages: true, permission: Permission.ADMIN },
];

function isRouteConcerned(route: ProtectedRoute, pathname: string): boolean {
	const isSamePage = pathname === route.path;
	const isSubPage = Boolean(route.includeSubPages) && pathname.startsWith(`${route.path}/`);

	return isSamePage || isSubPage;
}

export function canAccessRoute(user: AccessUser, pathname: string): boolean {
	const protectedRoute = PROTECTED_ROUTES.find((route) => isRouteConcerned(route, pathname));

	if (!protectedRoute) return true;

	return hasPermission(user, protectedRoute.permission);
}
