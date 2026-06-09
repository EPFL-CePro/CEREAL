import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    sciper: string;
    hasCrepAccess?: boolean;
    isAdmin?: boolean;
  }

  interface Session {
    user: {
      sciper: string
      username?: string
      oid?: string
      tid?: string
      hasCrepAccess: boolean
      isAdmin: boolean
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
    isAdmin?: boolean;
    error?: string;
  }
}
