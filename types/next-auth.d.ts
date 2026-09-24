import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    sciper: string;
    hasCrepAccess?: boolean;
    hasSACAccess?: boolean;
    isAdmin?: boolean;
    first_name?: string;
    last_name?: string;
  }

  interface Session {
    user: {
      sciper: string
      username?: string
      oid?: string
      tid?: string
      hasCrepAccess: boolean
      hasSACAccess: boolean
      isAdmin: boolean
      first_name: string
      last_name: string
      impersonating?: 'sac' | 'crep' | 'none' | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    expires_at?: number;
    oid?: string;
    tid?: string;
    uniqueid?: string;
    username?: string;
    hasCrepAccess?: boolean;
    hasSACAccess?: boolean;
    isAdmin?: boolean;
    first_name: string;
    last_name: string;
    impersonate?: 'sac' | 'crep' | 'none' | null;
    error?: string;
  }
}
