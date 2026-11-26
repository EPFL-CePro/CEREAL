import { describe, expect, it } from "vitest"

import { getTeacherEmailEligibility } from "@/app/lib/deferred-session/teacher-email-eligibility"
import { type TrackedExam } from "@/types/deferredSessionTracking"

type EligibilityInput = Pick<
  TrackedExam,
  "teachers" | "counts" | "isRegistrationOpen"
>

// An exam ready to be sent: registrations closed, all treated, one teacher with a sciper
function exam(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    teachers: [{ firstname: "Ada", name: "Lovelace", sciper: "123456" }],
    counts: { accepted: 2, notTreated: 0 },
    isRegistrationOpen: false,
    ...overrides,
  }
}

describe("getTeacherEmailEligibility", () => {
  it("allows sending when the list is final", () => {
    expect(getTeacherEmailEligibility(exam(), false)).toEqual({
      canSend: true,
    })
  })

  it("allows sending when no student is accepted", () => {
    const noStudent = exam({ counts: { accepted: 0, notTreated: 0 } })

    expect(getTeacherEmailEligibility(noStudent, false)).toEqual({
      canSend: true,
    })
  })

  it("blocks when the email has already been sent", () => {
    expect(getTeacherEmailEligibility(exam(), true)).toEqual({
      canSend: false,
      reason: "already_sent",
    })
  })

  it("blocks when the registration deadline is unknown", () => {
    const unknownDeadline = exam({ isRegistrationOpen: null })

    expect(getTeacherEmailEligibility(unknownDeadline, false)).toEqual({
      canSend: false,
      reason: "deadline_unknown",
    })
  })

  it("blocks while registrations are open", () => {
    const open = exam({ isRegistrationOpen: true })

    expect(getTeacherEmailEligibility(open, false)).toEqual({
      canSend: false,
      reason: "registration_open",
    })
  })

  it("blocks while registrations are not treated or on hold", () => {
    const pending = exam({ counts: { accepted: 2, notTreated: 1 } })

    expect(getTeacherEmailEligibility(pending, false)).toEqual({
      canSend: false,
      reason: "pending_registrations",
    })
  })

  it("blocks when the exam has no teacher", () => {
    expect(getTeacherEmailEligibility(exam({ teachers: [] }), false)).toEqual({
      canSend: false,
      reason: "no_teacher",
    })
  })

  it("blocks when a teacher has no sciper", () => {
    const withoutSciper = exam({
      teachers: [
        { firstname: "Ada", name: "Lovelace", sciper: "123456" },
        { firstname: "Alan", name: "Turing" },
      ],
    })

    expect(getTeacherEmailEligibility(withoutSciper, false)).toEqual({
      canSend: false,
      reason: "teacher_without_sciper",
    })
  })

  it("reports the already sent email first", () => {
    const sentThenReopened = exam({ isRegistrationOpen: true })

    expect(getTeacherEmailEligibility(sentThenReopened, true)).toEqual({
      canSend: false,
      reason: "already_sent",
    })
  })
})
