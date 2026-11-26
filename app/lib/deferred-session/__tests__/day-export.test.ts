import { describe, expect, it } from "vitest"

import {
  buildDayExportCsv,
  getDayExportFilename,
  getDayExportRows,
} from "@/app/lib/deferred-session/day-export"
import { type DeferredExamSlot } from "@/types/deferredSession"
import { type SacStatus } from "@/types/sacStatus"

const BOM = "﻿"
const HEADER =
  "PLACE,EMAIL,SCIPER,FIRSTNAME,LASTNAME,COURSE_CODE,COURSE_NAME,AM/PM"

function student(
  sciper: number,
  firstName: string,
  lastName: string,
  status: SacStatus = "accepted",
) {
  return {
    sciper,
    first_name: firstName,
    last_name: lastName,
    sac_status: status,
  }
}

function exam(
  code: string,
  slot: DeferredExamSlot,
  registrations: ReturnType<typeof student>[],
) {
  return { exam_code: code, exam_name: `${code} name`, slot, registrations }
}

const ada = student(111111, "Ada", "Lovelace")
const alan = student(222222, "Alan", "Turing")
const grace = student(333333, "Grace", "Hopper")

const day = [
  exam("MATH-101", "afternoon", [alan]),
  exam("CS-200", "morning", [alan, ada]),
  exam("CS-100", "morning", [grace]),
]

const summarize = (rows: ReturnType<typeof getDayExportRows>) =>
  rows.map((row) => `${row.slot} ${row.exam_code} ${row.last_name}`)

describe("getDayExportRows", () => {
  it("sorts the rows by slot, exam code, then name", () => {
    expect(summarize(getDayExportRows(day, "both"))).toEqual([
      "morning CS-100 Hopper",
      "morning CS-200 Lovelace",
      "morning CS-200 Turing",
      "afternoon MATH-101 Turing",
    ])
  })

  it("keeps only the exams of the morning", () => {
    expect(summarize(getDayExportRows(day, "morning"))).toEqual([
      "morning CS-100 Hopper",
      "morning CS-200 Lovelace",
      "morning CS-200 Turing",
    ])
  })

  it("keeps only the exams of the afternoon", () => {
    expect(summarize(getDayExportRows(day, "afternoon"))).toEqual([
      "afternoon MATH-101 Turing",
    ])
  })

  it("keeps only the accepted registrations", () => {
    const rows = getDayExportRows(
      [
        exam("CS-100", "morning", [
          ada,
          student(222222, "Alan", "Turing", "not_treated"),
          student(333333, "Grace", "Hopper", "on_hold"),
          student(444444, "Linus", "Torvalds", "not_accepted"),
        ]),
      ],
      "both",
    )

    expect(summarize(rows)).toEqual(["morning CS-100 Lovelace"])
  })

  it("gives a row for each time an exam is planned", () => {
    const rows = getDayExportRows(
      [exam("CS-100", "morning", [ada]), exam("CS-100", "afternoon", [ada])],
      "both",
    )

    expect(summarize(rows)).toEqual([
      "morning CS-100 Lovelace",
      "afternoon CS-100 Lovelace",
    ])
  })

  it("is empty when no student is accepted in the slot", () => {
    expect(getDayExportRows(day.slice(0, 1), "morning")).toEqual([])
  })
})

describe("buildDayExportCsv", () => {
  it("writes the rows with an empty PLACE column", () => {
    const rows = getDayExportRows(day, "both")
    const emails = new Map([
      [111111, "ada.lovelace@epfl.ch"],
      [222222, "alan.turing@epfl.ch"],
      [333333, "grace.hopper@epfl.ch"],
    ])

    expect(buildDayExportCsv(rows, emails)).toBe(
      `${BOM}${HEADER}\r\n` +
        ",grace.hopper@epfl.ch,333333,Grace,Hopper,CS-100,CS-100 name,AM\r\n" +
        ",ada.lovelace@epfl.ch,111111,Ada,Lovelace,CS-200,CS-200 name,AM\r\n" +
        ",alan.turing@epfl.ch,222222,Alan,Turing,CS-200,CS-200 name,AM\r\n" +
        ",alan.turing@epfl.ch,222222,Alan,Turing,MATH-101,MATH-101 name,PM\r\n",
    )
  })

  it("leaves the email empty when it was not found", () => {
    const rows = getDayExportRows([exam("CS-100", "morning", [ada])], "both")

    expect(buildDayExportCsv(rows, new Map())).toBe(
      `${BOM}${HEADER}\r\n,,111111,Ada,Lovelace,CS-100,CS-100 name,AM\r\n`,
    )
  })

  it("quotes the course names containing a comma", () => {
    const rows = getDayExportRows(
      [
        {
          ...exam("CS-100", "morning", [ada]),
          exam_name: "Analysis I, part 2",
        },
      ],
      "both",
    )

    expect(buildDayExportCsv(rows, new Map())).toBe(
      `${BOM}${HEADER}\r\n,,111111,Ada,Lovelace,CS-100,"Analysis I, part 2",AM\r\n`,
    )
  })
})

describe("getDayExportFilename", () => {
  const date = new Date("2026-07-06T00:00:00.000Z")

  it("names the file after the day and the slots", () => {
    expect(getDayExportFilename(date, "morning")).toBe(
      "deferred_2026-07-06_AM.csv",
    )
    expect(getDayExportFilename(date, "afternoon")).toBe(
      "deferred_2026-07-06_PM.csv",
    )
    expect(getDayExportFilename(date, "both")).toBe(
      "deferred_2026-07-06_AM-PM.csv",
    )
  })
})
