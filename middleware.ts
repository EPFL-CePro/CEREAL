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

	// Routes available to anyone as long as they are logged in.
	if (
		pathname === '/crep/register' || pathname.startsWith('/crep/register/') ||
		pathname === '/crep/exams' || pathname.startsWith('/crep/exams/') ||
		pathname === '/teachers-exam-subscribe' || pathname.startsWith('/teachers-exam-subscribe/') ||
		pathname === '/diff-exam-subscribe' || pathname.startsWith('/diff-exam-subscribe/')
	) {
    	return NextResponse.next();
  	}

	// For all other routes, requiring at least access to the app (group access). If not, redirecting to `/403`.
	if(!session.user.hasCrepAccess) {
		return NextResponse.redirect(new URL("/403", req.url));
	}

	// Routes available only to administrators of the app
	if (
		pathname === '/admin' || pathname.startsWith('/admin/') ||
		pathname === '/exams' || pathname.startsWith('/exams/') ||
		pathname === '/sac-absences' || pathname.startsWith('/sac-absences/')
	) {
		if(!session.user.isAdmin) {
			return NextResponse.redirect(new URL("/403", req.url));
		}
	}

	return NextResponse.next();

}

// All routes require login, except /api/auth, that is used to login... (and some static Next.js things)
export const config = {
  matcher: ["/((?!api/auth|api/upload-exam-files|api/crep/files|api/cereal/diff-exams/get-bo-user|api/cereal/diff-exams/upload-absence|403|_next/static|_next/image|favicon.ico).*)"],
}
