import { signIn } from "@/auth"

function getSafeCallbackUrl(callbackUrl: string | null) {
	if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) {
		return '/';
	}

	return callbackUrl;
}

export async function GET(req: Request) {
	const searchParams = new URL(req.url).searchParams;
	return signIn('microsoft-entra-id', { redirectTo: getSafeCallbackUrl(searchParams.get('callbackUrl')) });
}