import { auth } from "@/auth"
import { NextRequest, NextResponse } from 'next/server';
 
export default async function middleware(req: NextRequest) {
	const session = await auth();
	const { pathname } = new URL(req.url);

	if (!session?.user) {
		const authUrl = new URL('/api/auth', req.url);
		authUrl.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`);
		return NextResponse.redirect(authUrl);
	}

	// If user is admin, he can access anything.
	if(session.user.isAdmin) {
		return NextResponse.next();
	}

	// Routes available only to people who can access the CREP sub-module
	if (
		pathname === '/crep'
	) {
		if(!session.user.hasCrepAccess) {
			return NextResponse.redirect(new URL("/403", req.url));
		}
	}

	// Routes available only to the SAC.
	if (
		pathname === '/sac-absences' || pathname.startsWith('/sac-absences/')
	) {
		if(!session.user.hasSACAccess) {
			return NextResponse.redirect(new URL("/403", req.url));
		}
	}

	// Routes available only to administrators of the app
	if (
		pathname === '/admin' || pathname.startsWith('/admin/') ||
		pathname === '/exams' || pathname.startsWith('/exams/')
	) {
		if(!session.user.isAdmin) {
			return NextResponse.redirect(new URL("/403", req.url));
		}
	}

	// If the previous conditions did not match, it means that the route trying to be accessed is a non-protected route, anybody can access to.
	return NextResponse.next();

}

// All routes require login, except /api/auth, that is used to login... (and some static Next.js things)
export const config = {
  matcher: ["/((?!api/auth|api/upload-exam-files|api/crep/files|api/cereal/diff-exams/get-bo-user|api/cereal/diff-exams/upload-absence|403|_next/static|_next/image|favicon.ico).*)"],
}
