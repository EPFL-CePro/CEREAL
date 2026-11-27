import { describe, expect, it } from "vitest"

import {
  findPrintingDate,
  findPrintStartInDay,
  getRegistrationStatus,
} from "@/app/lib/crep/print-schedule"
import { type CrepExamPrintTiming } from "@/app/lib/crep-subscription/queries"

// Reference days (December 2026): Mon 7, Tue 8, Wed 9
const MONDAY = "2026-12-07"
const TUESDAY = "2026-12-08"
const WEDNESDAY = "2026-12-09"

/** A Date on `day` at `time`, e.g. at(TUESDAY, "09:30") */
function at(day: string, time: string): Date {
  return new Date(`${day}T${time}:00`)
}

/** A day at midnight, as returned by getBusinessDaysBetween */
function dayOf(day: string): Date {
  return at(day, "00:00")
}

/** An already booked printing on `day`, starting at `startTime` */
function makeExam(
  day: string,
  startTime: string,
  durationMinutes: number,
): CrepExamPrintTiming {
  return { print_date: at(day, startTime), print_duration: durationMinutes }
}

/** A printing that fills the whole day (08:00 → 18:00) */
function fullDay(day: string): CrepExamPrintTiming {
  return makeExam(day, "08:00", 600)
}

describe("findPrintStartInDay", () => {
  it("starts at 08:00 on an empty day", () => {
    expect(findPrintStartInDay(dayOf(TUESDAY), [], 60)).toEqual(
      at(TUESDAY, "08:00"),
    )
  })

  it("starts right after a single printing", () => {
    const exams = [makeExam(TUESDAY, "08:00", 30)] // ends 08:30

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "08:30"),
    )
  })

  it("starts in a gap between two printings when it is big enough", () => {
    const exams = [
      makeExam(TUESDAY, "08:00", 60), // ends 09:00
      makeExam(TUESDAY, "11:00", 60), // 2h gap before it
    ]

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "09:00"),
    )
  })

  it("accepts a gap exactly as long as the printing", () => {
    const exams = [
      makeExam(TUESDAY, "08:00", 60), // ends 09:00
      makeExam(TUESDAY, "10:00", 60), // exactly 1h gap
    ]

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "09:00"),
    )
  })

  it("uses the earliest gap that fits", () => {
    const exams = [
      makeExam(TUESDAY, "08:00", 60), // ends 09:00, 1h gap
      makeExam(TUESDAY, "10:00", 60), // ends 11:00, 2h gap
      makeExam(TUESDAY, "13:00", 60),
    ]

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "09:00"),
    )
  })

  it("starts after the last printing when no gap is big enough", () => {
    const exams = [
      makeExam(TUESDAY, "08:00", 120), // ends 10:00
      makeExam(TUESDAY, "10:30", 30), // 30 min gap, ends 11:00
    ]

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "11:00"),
    )
  })

  it("finds the last printing even when the exams are not sorted", () => {
    const exams = [
      makeExam(TUESDAY, "10:30", 30), // ends 11:00
      makeExam(TUESDAY, "08:00", 120), // ends 10:00
    ]

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "11:00"),
    )
  })

  it("accepts a printing that ends exactly at 18:00", () => {
    const exams = [makeExam(TUESDAY, "08:00", 540)] // ends 17:00

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toEqual(
      at(TUESDAY, "17:00"),
    )
  })

  it("returns null when the printing would end after 18:00", () => {
    const exams = [makeExam(TUESDAY, "08:00", 570)] // ends 17:30

    expect(findPrintStartInDay(dayOf(TUESDAY), exams, 60)).toBeNull()
  })
})

describe("findPrintingDate", () => {
  const candidateDays = [dayOf(MONDAY), dayOf(TUESDAY), dayOf(WEDNESDAY)]

  it("uses the latest candidate day first", () => {
    expect(findPrintingDate(candidateDays, [], 60)).toEqual(
      at(WEDNESDAY, "08:00"),
    )
  })

  it("goes back to an earlier day when the latest one is full", () => {
    const exams = [fullDay(WEDNESDAY)]

    expect(findPrintingDate(candidateDays, exams, 60)).toEqual(
      at(TUESDAY, "08:00"),
    )
  })

  it("only takes into account the printings of the same day", () => {
    // Monday and Tuesday are full, Wednesday has one short printing
    const exams = [
      fullDay(MONDAY),
      fullDay(TUESDAY),
      makeExam(WEDNESDAY, "08:00", 30),
    ]

    expect(findPrintingDate(candidateDays, exams, 60)).toEqual(
      at(WEDNESDAY, "08:30"),
    )
  })

  it("returns null when no day has room", () => {
    const exams = [fullDay(MONDAY), fullDay(TUESDAY), fullDay(WEDNESDAY)]

    expect(findPrintingDate(candidateDays, exams, 60)).toBeNull()
  })

  it("returns null when there is no candidate day", () => {
    expect(findPrintingDate([], [], 60)).toBeNull()
  })

  it("does not reorder the candidate days", () => {
    const days = [dayOf(MONDAY), dayOf(TUESDAY), dayOf(WEDNESDAY)]

    findPrintingDate(days, [], 60)

    expect(days).toEqual([dayOf(MONDAY), dayOf(TUESDAY), dayOf(WEDNESDAY)])
  })
})

describe("getRegistrationStatus", () => {
  it.each([
    {
      isReserved: false,
      hasPrintSlot: true,
      isDeliveryTooSoon: false,
      expected: "registered",
    },
    {
      isReserved: false,
      hasPrintSlot: true,
      isDeliveryTooSoon: true,
      expected: "registered-warning",
    },
    {
      isReserved: false,
      hasPrintSlot: false,
      isDeliveryTooSoon: false,
      expected: "registered-error",
    },
    // No slot is more serious than a delivery too soon
    {
      isReserved: false,
      hasPrintSlot: false,
      isDeliveryTooSoon: true,
      expected: "registered-error",
    },
    // A reserved exam always stays "reserved"
    {
      isReserved: true,
      hasPrintSlot: false,
      isDeliveryTooSoon: true,
      expected: "reserved",
    },
  ])(
    "returns $expected (reserved: $isReserved, slot: $hasPrintSlot, delivery too soon: $isDeliveryTooSoon)",
    ({ expected, ...input }) => {
      expect(getRegistrationStatus(input)).toBe(expected)
    },
  )
})
