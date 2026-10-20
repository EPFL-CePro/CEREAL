export interface AccessUser {
	isAdmin?: boolean;
	hasCrepAccess?: boolean;
	hasSACAccess?: boolean;
}

export function canAccessRoute(user: AccessUser, pathname: string): boolean {
	// If user is admin, he can access anything.
	if (user.isAdmin) {
		return true;
	}

	// Routes available only to people who can access the CREP sub-module
	if (
		pathname === '/crep'
	) {
		if (!user.hasCrepAccess) {
			return false;
		}
	}

	// Routes available only to the SAC.
	if (
		pathname === '/sac-absences' || pathname.startsWith('/sac-absences/')
	) {
		if (!user.hasSACAccess) {
			return false;
		}
	}

	// Routes available only to administrators of the app
	if (
		pathname === '/admin' || pathname.startsWith('/admin/') ||
		pathname === '/exams' || pathname.startsWith('/exams/')
	) {
		if (!user.isAdmin) {
			return false;
		}
	}

	// If the previous conditions did not match, it means that the route trying to be accessed is a non-protected route, anybody can access to.
	return true;
}
