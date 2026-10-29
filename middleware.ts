import { auth } from "@/auth"
import { NextRequest, NextResponse } from 'next/server';
import { canAccessRoute } from "@/app/lib/auth/routeAccess";
 
export default async function middleware(req: NextRequest) {
	const session = await auth();
	const { pathname } = new URL(req.url);

	if (!session?.user) {
		const authUrl = new URL('/api/auth', req.url);
		authUrl.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`);
		return NextResponse.redirect(authUrl);
	}

	if (!canAccessRoute(session.user, pathname)) {
		return NextResponse.redirect(new URL("/403", req.url));
	}

	return NextResponse.next();

}

// All routes require login, except /api/auth, that is used to login... (and some static Next.js things)
export const config = {
  matcher: ["/((?!api/auth|api/digital-archiving/unzip|api/upload-exam-files|api/crep/files|api/cereal/diff-exams/get-bo-user|api/cereal/diff-exams/upload-absence|403|_next/static|_next/image|favicon.ico).*)"],
}
