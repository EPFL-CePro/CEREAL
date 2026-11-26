import { beforeEach, describe, expect, it, vi } from "vitest"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { getActiveDeferredSessionTracking } from "@/app/lib/database"
import { exportDeferredSessionDay } from "@/app/lib/deferred-session/day-export-actions"
import { fetchMultiplePersonsBySciper } from "@/app/lib/epfl/epfl-api"
import { type DeferredExamSlot } from "@/types/deferredSession"
import {
  type DeferredSessionTracking,
  type TrackedExam,
  type TrackedRegistration,
} from "@/types/deferredSessionTracking"
import { type SacStatus } from "@/types/sacStatus"

// Everything around the action is replaced: only its logic is tested
vi.mock("@/app/lib/auth/require-permission", () => ({
  requirePermission: vi.fn(),
}))
vi.mock("@/app/lib/database", () => ({
  getActiveDeferredSessionTracking: vi.fn(),
}))
vi.mock("@/app/lib/epfl/epfl-api", () => ({
  fetchMultiplePersonsBySciper: vi.fn(),
}))

const BOM = "﻿"
const HEADER =
  "PLACE,EMAIL,SCIPER,FIRSTNAME,LASTNAME,COURSE_CODE,COURSE_NAME,AM/PM"

function registration(
  sciper: number,
  firstName: string,
  lastName: string,
  status: SacStatus = "accepted",
): TrackedRegistration {
  return {
    id: sciper,
    exam_code: "CS-101",
    exam_name: "Programming",
    exam_date: new Date("2026-06-20"),
    sac_status: status,
    sciper,
    first_name: firstName,
    last_name: lastName,
  }
}

function exam(
  id: number,
  code: string,
  slot: DeferredExamSlot,
  registrations: TrackedRegistration[],
): TrackedExam {
  return {
    id,
    day_id: 1,
    session_id: 1,
    exam_code: code,
    exam_name: `${code} name`,
    teachers: [],
    slot,
    registrations,
    counts: { accepted: 0, notTreated: 0 },
    isRegistrationOpen: false,
    teacherEmail: null,
  }
}

// Ada and Alan in the morning, Alan again in the afternoon
const tracking: DeferredSessionTracking = {
  id: 1,
  name: "Deferred exams - July 2026",
  days: [
    {
      id: 1,
      date: new Date("2026-07-06T00:00:00.000Z"),
      exams: [
        exam(7, "CS-101", "morning", [
          registration(111111, "Ada", "Lovelace"),
          registration(222222, "Alan", "Turing"),
          registration(333333, "Grace", "Hopper", "not_treated"),
        ]),
        exam(8, "MATH-101", "afternoon", [
          registration(222222, "Alan", "Turing"),
        ]),
      ],
      counts: { accepted: 0, notTreated: 0 },
    },
  ],
  unmatched: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue(tracking)
  vi.mocked(fetchMultiplePersonsBySciper).mockResolvedValue([
    { id: "111111", email: "ada.lovelace@epfl.ch" },
    { id: "222222", email: "alan.turing@epfl.ch" },
  ] as never)
})

describe("exportDeferredSessionDay", () => {
  it("exports the accepted students of both slots with their email", async () => {
    const result = await exportDeferredSessionDay(1, "both")

    expect(requirePermission).toHaveBeenCalled()
    // Each student is fetched once, even with two exams
    expect(fetchMultiplePersonsBySciper).toHaveBeenCalledWith("111111,222222")
    expect(result).toEqual({
      success: true,
      file: {
        filename: "deferred_2026-07-06_AM-PM.csv",
        content:
          `${BOM}${HEADER}\r\n` +
          ",ada.lovelace@epfl.ch,111111,Ada,Lovelace,CS-101,CS-101 name,AM\r\n" +
          ",alan.turing@epfl.ch,222222,Alan,Turing,CS-101,CS-101 name,AM\r\n" +
          ",alan.turing@epfl.ch,222222,Alan,Turing,MATH-101,MATH-101 name,PM\r\n",
      },
      warning: undefined,
    })
  })

  it("exports only the chosen slot", async () => {
    const result = await exportDeferredSessionDay(1, "afternoon")

    expect(fetchMultiplePersonsBySciper).toHaveBeenCalledWith("222222")
    expect(result).toMatchObject({
      success: true,
      file: { filename: "deferred_2026-07-06_PM.csv" },
    })
    if (!result.success || !result.file) throw new Error("No file")
    expect(result.file.content).not.toContain("CS-101")
  })

  it("gives no file when no student is accepted in the slot", async () => {
    vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue({
      ...tracking,
      days: [{ ...tracking.days[0], exams: [tracking.days[0].exams[1]] }],
    })

    const result = await exportDeferredSessionDay(1, "morning")

    expect(result).toEqual({ success: true, file: null })
    expect(fetchMultiplePersonsBySciper).not.toHaveBeenCalled()
  })

  it("leaves the missing emails empty and warns about them", async () => {
    vi.mocked(fetchMultiplePersonsBySciper).mockResolvedValue([
      { id: "111111", email: "ada.lovelace@epfl.ch" },
    ] as never)

    const result = await exportDeferredSessionDay(1, "both")

    expect(result).toMatchObject({
      success: true,
      warning: "No email found for 1 student: their EMAIL cell is empty.",
    })
    if (!result.success || !result.file) throw new Error("No file")
    expect(result.file.content).toContain(
      ",,222222,Alan,Turing,MATH-101,MATH-101 name,PM",
    )
  })

  it("still exports when the emails cannot be fetched", async () => {
    vi.mocked(fetchMultiplePersonsBySciper).mockRejectedValue(
      new Error("EPFL API down"),
    )

    const result = await exportDeferredSessionDay(1, "both")

    expect(result).toMatchObject({
      success: true,
      warning:
        "The students' emails could not be fetched: the EMAIL column is empty.",
    })
    if (!result.success || !result.file) throw new Error("No file")
    expect(result.file.content).toContain(
      ",,111111,Ada,Lovelace,CS-101,CS-101 name,AM",
    )
  })

  it("refuses a day that is not in the active session", async () => {
    const result = await exportDeferredSessionDay(99, "both")

    expect(result).toEqual({
      success: false,
      error: "This day is not part of the active deferred session.",
    })
  })

  it("refuses when there is no active session", async () => {
    vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue(null)

    const result = await exportDeferredSessionDay(1, "both")

    expect(result).toMatchObject({ success: false })
  })

  it("refuses an unknown slot", async () => {
    const result = await exportDeferredSessionDay(1, "night" as never)

    expect(result).toEqual({ success: false, error: "Unknown slot." })
    expect(getActiveDeferredSessionTracking).not.toHaveBeenCalled()
  })
})
