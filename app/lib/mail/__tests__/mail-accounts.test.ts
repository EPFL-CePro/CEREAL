import { describe, expect, it } from "vitest"

import { getMailAccountConfig } from "@/app/lib/mail/mail-accounts"

const ENV = {
  MAIL_SMTP_HOST: "smtp.example.com",
  MAIL_AUTH_USER: "default-user",
  MAIL_AUTH_PASS: "default-pass",
  MAIL_FROM_EMAIL: "noreply@example.com",
  MAIL_DEFERRED_AUTH_USER: "deferred-user",
  MAIL_DEFERRED_AUTH_PASS: "deferred-pass",
  MAIL_DEFERRED_FROM_EMAIL: "deferred@example.com",
}

describe("getMailAccountConfig", () => {
  it("reads the default account", () => {
    expect(getMailAccountConfig("default", ENV)).toEqual({
      host: "smtp.example.com",
      user: "default-user",
      pass: "default-pass",
      from: "noreply@example.com",
    })
  })

  it("reads the deferred exams account, with the shared SMTP host", () => {
    expect(getMailAccountConfig("deferred_exams", ENV)).toEqual({
      host: "smtp.example.com",
      user: "deferred-user",
      pass: "deferred-pass",
      from: "deferred@example.com",
    })
  })

  it("throws instead of falling back to the default account", () => {
    const env = { ...ENV, MAIL_DEFERRED_AUTH_PASS: undefined }

    expect(() => getMailAccountConfig("deferred_exams", env)).toThrow(
      'Mail account "deferred_exams" is not configured, missing: MAIL_DEFERRED_AUTH_PASS',
    )
  })

  it("throws when the shared SMTP host is missing", () => {
    const env = { ...ENV, MAIL_SMTP_HOST: "" }

    expect(() => getMailAccountConfig("default", env)).toThrow(
      "missing: MAIL_SMTP_HOST",
    )
  })
})
