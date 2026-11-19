import { describe, expect, it } from "vitest"

import { canAccessRoute } from "@/app/lib/auth/route-access"

describe("canAccessRoute", () => {
  it("denies the admin route to a user without any role", () => {
    const userWithoutRole = { isAdmin: false }

    expect(canAccessRoute(userWithoutRole, "/admin")).toBe(false)
  })

  it("allows the CREP route to a user with CREP access", () => {
    const crepUser = { hasCrepAccess: true }

    expect(canAccessRoute(crepUser, "/crep")).toBe(true)
  })

  it("allows the SAC route to a user with SAC access", () => {
    const sacUser = { hasSACAccess: true }

    expect(canAccessRoute(sacUser, "/sac-absences")).toBe(true)
  })

  it("denies the deferred session route to a user with SAC access", () => {
    const sacUser = { hasSACAccess: true }

    expect(canAccessRoute(sacUser, "/deferred-session")).toBe(false)
  })

  it("allows the deferred session route to an admin", () => {
    const admin = { isAdmin: true }

    expect(canAccessRoute(admin, "/deferred-session")).toBe(true)
  })

  it("allows a route that is not protected to a user without any role", () => {
    const userWithoutRole = {}

    expect(canAccessRoute(userWithoutRole, "/")).toBe(true)
  })
})
