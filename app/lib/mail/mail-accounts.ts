/* SMTP accounts the app can send emails from. All accounts share the same SMTP
host (MAIL_SMTP_HOST): only the credentials and the sender address change. */
export type MailAccount = "default" | "deferred_exams"

export type MailAccountConfig = {
  host: string
  user: string
  pass: string
  from: string
}

// Environment variables holding the credentials and sender of each account
const ACCOUNT_ENV_VARS: Record<
  MailAccount,
  { user: string; pass: string; from: string }
> = {
  default: {
    user: "MAIL_AUTH_USER",
    pass: "MAIL_AUTH_PASS",
    from: "MAIL_FROM_EMAIL",
  },
  deferred_exams: {
    user: "MAIL_DEFERRED_AUTH_USER",
    pass: "MAIL_DEFERRED_AUTH_PASS",
    from: "MAIL_DEFERRED_FROM_EMAIL",
  },
}

/* Read the SMTP configuration of an account. Throws if a variable is missing:
never fall back to another account, the email would silently be sent from the
wrong address. */
export function getMailAccountConfig(
  account: MailAccount,
  env: Record<string, string | undefined> = process.env,
): MailAccountConfig {
  const vars = { host: "MAIL_SMTP_HOST", ...ACCOUNT_ENV_VARS[account] }

  const missing = Object.values(vars).filter((name) => !env[name])
  if (missing.length > 0) {
    throw new Error(
      `Mail account "${account}" is not configured, missing: ${missing.join(", ")}`,
    )
  }

  return {
    host: env[vars.host]!,
    user: env[vars.user]!,
    pass: env[vars.pass]!,
    from: env[vars.from]!,
  }
}
