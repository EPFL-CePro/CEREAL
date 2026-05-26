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

	if (pathname === '/register' || pathname.startsWith('/register/')) {
    	return NextResponse.next();
  	}

	const groups = session.user.groups || [];
	// `_AppGrpU` after the group name is needed because of what is returned by EPFL's Entra...
	const authorizedGroups = ['CREP-access_AppGrpU', 'CREP-admin_AppGrpU'];
	const isInAllowedGroup = groups.some((group:string) => authorizedGroups.includes(group));

	if(!isInAllowedGroup) {
		return NextResponse.redirect(new URL("/403", req.url));
	}

	return NextResponse.next();

}

// All routes require login, except /api/auth, that is used to login... (and some static Next.js things)
export const config = {
  matcher: ["/((?!api/auth|api/upload-exam-files|403|_next/static|_next/image|favicon.ico).*)"],
}
