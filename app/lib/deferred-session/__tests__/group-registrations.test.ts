import { describe, expect, it } from "vitest"

import { groupRegistrationsBySession } from "@/app/lib/deferred-session/group-registrations"
import {
  type DeferredExamSlot,
  type DeferredSession,
  type DeferredSessionExam,
} from "@/types/deferredSession"
import { type TrackedRegistration } from "@/types/deferredSessionTracking"
import { type SacStatus } from "@/types/sacStatus"

function exam(
  id: number,
  code: string,
  slot: DeferredExamSlot = "morning",
): DeferredSessionExam {
  return {
    id,
    day_id: 0,
    session_id: 1,
    exam_code: code,
    exam_name: `Exam ${code}`,
    teachers: [],
    slot,
  }
}

function session(
  days: { id: number; date: string; exams: DeferredSessionExam[] }[],
): DeferredSession {
  return {
    id: 1,
    name: "Winter 2027",
    is_active: true,
    created_at: new Date("2026-11-01"),
    days: days.map((day) => ({
      id: day.id,
      session_id: 1,
      date: new Date(day.date),
      exams: day.exams,
    })),
  }
}

function registration(
  id: number,
  code: string,
  status: SacStatus,
  lastName = `Student${id}`,
): TrackedRegistration {
  return {
    id,
    exam_code: code,
    exam_name: `Exam ${code}`,
    exam_date: new Date("2026-06-20"),
    sac_status: status,
    sciper: 100000 + id,
    first_name: "Alex",
    last_name: lastName,
  }
}

describe("groupRegistrationsBySession", () => {
  it("puts registrations under the exam with the same code", () => {
    const result = groupRegistrationsBySession(
      session([
        {
          id: 1,
          date: "2027-01-14",
          exams: [exam(1, "CS-101"), exam(2, "MATH-201")],
        },
      ]),
      [
        registration(1, "CS-101", "accepted"),
        registration(2, "MATH-201", "accepted"),
      ],
    )

    const [cs, math] = result.days[0].exams
    expect(cs.registrations.map((r) => r.id)).toEqual([1])
    expect(math.registrations.map((r) => r.id)).toEqual([2])
  })

  it("shows the students of an exam planned twice under both days", () => {
    const result = groupRegistrationsBySession(
      session([
        { id: 1, date: "2027-01-14", exams: [exam(1, "CS-101")] },
        { id: 2, date: "2027-01-15", exams: [exam(2, "CS-101")] },
      ]),
      [registration(1, "CS-101", "accepted")],
    )

    expect(result.days[0].exams[0].registrations.map((r) => r.id)).toEqual([1])
    expect(result.days[1].exams[0].registrations.map((r) => r.id)).toEqual([1])
  })

  it("hides refused registrations", () => {
    const result = groupRegistrationsBySession(
      session([{ id: 1, date: "2027-01-14", exams: [exam(1, "CS-101")] }]),
      [
        registration(1, "CS-101", "not_accepted"),
        registration(2, "PHYS-101", "not_accepted"),
      ],
    )

    expect(result.days[0].exams[0].registrations).toEqual([])
    expect(result.unmatched).toEqual([])
  })

  it("counts on hold registrations with the not yet treated ones", () => {
    const result = groupRegistrationsBySession(
      session([
        {
          id: 1,
          date: "2027-01-14",
          exams: [exam(1, "CS-101"), exam(2, "MATH-201")],
        },
      ]),
      [
        registration(1, "CS-101", "accepted"),
        registration(2, "CS-101", "not_treated"),
        registration(3, "CS-101", "on_hold"),
        registration(4, "MATH-201", "accepted"),
      ],
    )

    expect(result.days[0].exams[0].counts).toEqual({
      accepted: 1,
      notTreated: 2,
    })
    expect(result.days[0].counts).toEqual({ accepted: 2, notTreated: 2 })
  })

  it("lists registrations to an exam that is not in the session", () => {
    const result = groupRegistrationsBySession(
      session([{ id: 1, date: "2027-01-14", exams: [exam(1, "CS-101")] }]),
      [
        registration(1, "CS-101", "accepted"),
        registration(2, "PHYS-101", "not_treated"),
      ],
    )

    expect(result.unmatched.map((r) => r.id)).toEqual([2])
  })

  it("keeps an exam without any registration", () => {
    const result = groupRegistrationsBySession(
      session([{ id: 1, date: "2027-01-14", exams: [exam(1, "CS-101")] }]),
      [],
    )

    expect(result.days[0].exams[0].registrations).toEqual([])
    expect(result.days[0].counts).toEqual({ accepted: 0, notTreated: 0 })
  })

  it("sorts days by date, exams by slot and students by name", () => {
    const result = groupRegistrationsBySession(
      session([
        { id: 2, date: "2027-01-15", exams: [] },
        {
          id: 1,
          date: "2027-01-14",
          exams: [
            exam(1, "CS-101", "afternoon"),
            exam(2, "MATH-201", "morning"),
          ],
        },
      ]),
      [
        registration(1, "CS-101", "accepted", "Zimmer"),
        registration(2, "CS-101", "accepted", "Albert"),
      ],
    )

    expect(result.days.map((d) => d.id)).toEqual([1, 2])
    expect(result.days[0].exams.map((e) => e.exam_code)).toEqual([
      "MATH-201",
      "CS-101",
    ])
    expect(
      result.days[0].exams[1].registrations.map((r) => r.last_name),
    ).toEqual(["Albert", "Zimmer"])
  })
})
