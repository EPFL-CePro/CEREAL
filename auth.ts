import NextAuth, { Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

const AUTHORIZED_CREP_GROUP = 'CEREAL-CREP_AppGrpU';
const AUTHORIZED_SAC_GROUP = 'CEREAL-SAC_AppGrpU';
const ADMIN_GROUP = 'CEREAL-admin_AppGrpU';

const decodeJWT = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

const getGroups = (groups: unknown): string[] => Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];
const getStringClaim = (claim: unknown): string => typeof claim === 'string' ? claim : '';

const createSessionToken = (token: JWT, idToken: Record<string, unknown>, accessToken: Record<string, unknown>, expiresAt?: number) => {
	const groups = getGroups(idToken.groups);
	const firstName = getStringClaim(idToken.given_name);
	const lastName = getStringClaim(idToken.family_name);

	return {
		name: `${firstName} ${lastName}`.trim(),
		email: typeof idToken.email === 'string' ? idToken.email : token.email,
		picture: token.picture || '',
		expires_at: expiresAt,
		oid: typeof idToken.oid === 'string' ? idToken.oid : '',
		tid: typeof accessToken.tid === 'string' ? accessToken.tid : '',
		uniqueid: typeof idToken.uniqueid === 'string' ? idToken.uniqueid : '',
		username: typeof idToken.gaspar === 'string' ? idToken.gaspar : '',
		hasCrepAccess: groups.includes(AUTHORIZED_CREP_GROUP),
		hasSACAccess: groups.includes(AUTHORIZED_SAC_GROUP),
		isAdmin: groups.includes(ADMIN_GROUP),
		first_name: firstName,
		last_name: lastName,
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
		hasCrepAccess: token.hasCrepAccess ?? groups.includes(AUTHORIZED_CREP_GROUP),
		hasSACAccess: token.hasSACAccess ?? groups.includes(AUTHORIZED_SAC_GROUP),
		isAdmin: token.isAdmin ?? groups.includes(ADMIN_GROUP),
		first_name: token.first_name || '',
		last_name: token.last_name || '',
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
					hasSACAccess: false,
					isAdmin: false,
					first_name: token.first_name || '',
					last_name: token.last_name || '',
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
					hasSACAccess: Boolean(token.hasSACAccess),
					isAdmin: Boolean(token.isAdmin),
					first_name: token.first_name || '',
					last_name: token.last_name || '',
				},
			};
		},
	},
});