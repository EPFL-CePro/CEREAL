import NextAuth, { Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

const AUTHORIZED_GROUPS = ['CREP-access_AppGrpU', 'CREP-admin_AppGrpU'];
const ADMIN_GROUP = 'CREP-admin_AppGrpU';

const decodeJWT = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

const getGroups = (groups: unknown): string[] => Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];

const createSessionToken = (token: JWT, idToken: Record<string, unknown>, accessToken: Record<string, unknown>, expiresAt?: number) => {
	const groups = getGroups(idToken.groups);

	return {
		name: `${idToken.given_name ?? ''} ${idToken.family_name ?? ''}`.trim(),
		email: typeof idToken.email === 'string' ? idToken.email : token.email,
		picture: token.picture || '',
		expires_at: expiresAt,
		oid: typeof idToken.oid === 'string' ? idToken.oid : '',
		tid: typeof accessToken.tid === 'string' ? accessToken.tid : '',
		uniqueid: typeof idToken.uniqueid === 'string' ? idToken.uniqueid : '',
		username: typeof idToken.gaspar === 'string' ? idToken.gaspar : '',
		hasCrepAccess: groups.some((group) => AUTHORIZED_GROUPS.includes(group)),
		isAdmin: groups.includes(ADMIN_GROUP),
	};
};

const sanitizeExistingToken = (token: JWT) => {
	const groups = getGroups(token.groups);
	let expiresAt = typeof token.expires_at === 'number' ? token.expires_at : undefined;
	let tid = typeof token.tid === 'string' ? token.tid : '';

	if ((!expiresAt || !tid) && typeof token.access_token === 'string') {
		const accessToken = decodeJWT(token.access_token);
		expiresAt = expiresAt || accessToken.exp;
		tid = tid || accessToken.tid || '';
	}

	return {
		name: token.name || '',
		email: token.email || '',
		picture: token.picture || '',
		expires_at: expiresAt,
		oid: token.oid || '',
		tid,
		uniqueid: token.uniqueid || '',
		username: token.username || '',
		hasCrepAccess: token.hasCrepAccess ?? groups.some((group) => AUTHORIZED_GROUPS.includes(group)),
		isAdmin: token.isAdmin ?? groups.includes(ADMIN_GROUP),
		error: token.error,
	};
};

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		MicrosoftEntraID({
			clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
			clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
			issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
			authorization: {
				params: {
					scope: 'openid email profile',
				},
			},
		}),
	],
	callbacks: {
		authorized: async ({ auth }) => !!auth,
		jwt: async ({ token, account }: { token: JWT; account?: Account | null }) => {
			try {
				if (account?.access_token && account?.id_token) {
					const accessToken = decodeJWT(account.access_token);
					const idToken = decodeJWT(account.id_token);

					return createSessionToken(token, idToken, accessToken, account.expires_at);
				}

				const sanitizedToken = sanitizeExistingToken(token);

				if (!sanitizedToken.expires_at || Date.now() < sanitizedToken.expires_at * 1000) {
					return sanitizedToken;
				}

				return { ...sanitizedToken, error: 'TokenExpired' };
			} catch (error) {
				console.error('Error processing tokens:', error);
				return {
					name: token.name || '',
					email: token.email || '',
					picture: token.picture || '',
					hasCrepAccess: false,
					isAdmin: false,
					error: 'TokenProcessingError',
				};
			}
		},
		session: async ({ session, token }) => {
			return {
				...session,
				user: {
					email: token?.email || session.user?.email || '',
					name: token?.name || '',
					image: session.user?.image || null,
					sciper: token?.uniqueid || '',
					username: token?.username || '',
					oid: token.oid || '',
					tid: token.tid || '',
					hasCrepAccess: Boolean(token.hasCrepAccess),
					isAdmin: Boolean(token.isAdmin),
				},
			};
		},
	},
});