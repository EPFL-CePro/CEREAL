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

// Most tests don't care about registration deadlines
function group(
  deferredSession: DeferredSession,
  registrations: TrackedRegistration[],
  ordinaryExamDates = new Map<string, string>(),
  now = new Date("2026-06-25T10:00:00Z"),
) {
  return groupRegistrationsBySession(
    deferredSession,
    registrations,
    ordinaryExamDates,
    now,
  )
}

describe("groupRegistrationsBySession", () => {
  it("puts registrations under the exam with the same code", () => {
    const result = group(
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
    const result = group(
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
    const result = group(
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
    const result = group(
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
    const result = group(
      session([{ id: 1, date: "2027-01-14", exams: [exam(1, "CS-101")] }]),
      [
        registration(1, "CS-101", "accepted"),
        registration(2, "PHYS-101", "not_treated"),
      ],
    )

    expect(result.unmatched.map((r) => r.id)).toEqual([2])
  })

  it("keeps an exam without any registration", () => {
    const result = group(
      session([{ id: 1, date: "2027-01-14", exams: [exam(1, "CS-101")] }]),
      [],
    )

    expect(result.days[0].exams[0].registrations).toEqual([])
    expect(result.days[0].counts).toEqual({ accepted: 0, notTreated: 0 })
  })

  it("sorts days by date, exams by slot and students by name", () => {
    const result = group(
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

  it("tells whether registrations can still come for each exam", () => {
    const result = group(
      session([
        {
          id: 1,
          date: "2027-01-14",
          exams: [exam(1, "CS-101"), exam(2, "MATH-201"), exam(3, "PHYS-101")],
        },
      ]),
      [],
      // Thursday 2026-06-25: CS-101 (Monday 22nd) is open until Thursday 25th,
      // MATH-201 (Friday 19th) was open until Wednesday 24th, PHYS-101 is not in the BO file
      new Map([
        ["CS-101", "2026-06-22T00:00:00.000Z"],
        ["MATH-201", "2026-06-19T00:00:00.000Z"],
      ]),
    )

    expect(result.days[0].exams.map((e) => e.isRegistrationOpen)).toEqual([
      true,
      false,
      null,
    ])
  })
})
