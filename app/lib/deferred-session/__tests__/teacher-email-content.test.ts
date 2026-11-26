import { describe, expect, it } from "vitest"

import {
  NO_STUDENT_MESSAGE,
  buildStudentsAttachment,
  buildStudentsCsv,
  buildTeacherEmailContext,
  formatStudentsSummary,
  getStudentsCsvFilename,
} from "@/app/lib/deferred-session/teacher-email-content"
import { type SacStatus } from "@/types/sacStatus"

const BOM = "\uFEFF"

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

describe("buildStudentsCsv", () => {
  it("lists the accepted students sorted by last name", () => {
    const csv = buildStudentsCsv([
      student(222222, "Alan", "Turing"),
      student(111111, "Ada", "Lovelace"),
    ])

    expect(csv).toBe(
      `${BOM}SCIPER,FIRSTNAME,LASTNAME\r\n111111,Ada,Lovelace\r\n222222,Alan,Turing\r\n`,
    )
  })

  it("leaves out the students who are not accepted", () => {
    const csv = buildStudentsCsv([
      student(111111, "Ada", "Lovelace"),
      student(222222, "Alan", "Turing", "not_accepted"),
    ])

    expect(csv).toBe(
      `${BOM}SCIPER,FIRSTNAME,LASTNAME\r\n111111,Ada,Lovelace\r\n`,
    )
  })

  it("quotes the fields containing a comma or a quote", () => {
    const csv = buildStudentsCsv([student(111111, 'Jo "J"', "Doe, Jr")])

    expect(csv).toBe(
      `${BOM}SCIPER,FIRSTNAME,LASTNAME\r\n111111,"Jo ""J""","Doe, Jr"\r\n`,
    )
  })

  it("keeps the accented names", () => {
    const csv = buildStudentsCsv([student(111111, "Hélène", "Müller")])

    expect(csv).toContain("111111,Hélène,Müller")
  })
})

describe("getStudentsCsvFilename", () => {
  it("names the file after the exam code and date", () => {
    // A DATE column is read by Prisma as midnight UTC
    const date = new Date("2026-07-06T00:00:00.000Z")

    expect(getStudentsCsvFilename("CS-101", date)).toBe(
      "CS-101_2026-07-06_students.csv",
    )
    expect(getStudentsCsvFilename("MATH 101/a", date)).toBe(
      "MATH_101_a_2026-07-06_students.csv",
    )
  })
})

describe("buildStudentsAttachment", () => {
  const date = new Date("2026-07-06T00:00:00.000Z")

  it("attaches the CSV file of the accepted students", () => {
    const registrations = [student(111111, "Ada", "Lovelace")]

    expect(buildStudentsAttachment("CS-101", date, registrations)).toEqual({
      filename: "CS-101_2026-07-06_students.csv",
      content: buildStudentsCsv(registrations),
      contentType: "text/csv; charset=utf-8",
    })
  })

  it("attaches nothing when no student is accepted", () => {
    const refused = [student(111111, "Ada", "Lovelace", "not_accepted")]

    expect(buildStudentsAttachment("CS-101", date, [])).toBeNull()
    expect(buildStudentsAttachment("CS-101", date, refused)).toBeNull()
  })
})

describe("formatStudentsSummary", () => {
  it("gives the number of accepted students", () => {
    expect(
      formatStudentsSummary([
        student(111111, "Ada", "Lovelace"),
        student(222222, "Alan", "Turing"),
        student(333333, "Grace", "Hopper", "not_accepted"),
      ]),
    ).toBe(
      "2 students are registered to this deferred exam: you will find the list in the attached CSV file.",
    )
    expect(formatStudentsSummary([student(1, "Ada", "Lovelace")])).toBe(
      "1 student is registered to this deferred exam: you will find the list in the attached CSV file.",
    )
  })

  it("says that nobody is registered when no student is accepted", () => {
    expect(formatStudentsSummary([])).toBe(NO_STUDENT_MESSAGE)
    expect(
      formatStudentsSummary([student(1, "Ada", "Lovelace", "not_accepted")]),
    ).toBe(NO_STUDENT_MESSAGE)
  })
})

describe("buildTeacherEmailContext", () => {
  it("fills every placeholder of the template", () => {
    const context = buildTeacherEmailContext({
      examCode: "CS-101",
      examName: "Programming",
      examDate: new Date("2026-07-06T00:00:00.000Z"),
      slot: "afternoon",
      teacherEmails: ["ada@epfl.ch", "alan@epfl.ch"],
      registrations: [student(111111, "Ada", "Lovelace")],
    })

    expect(context).toEqual({
      "teachers.email": "ada@epfl.ch, alan@epfl.ch",
      examCode: "CS-101",
      examName: "Programming",
      examDate: "2026-07-06",
      slot: "afternoon",
      students:
        "1 student is registered to this deferred exam: you will find the list in the attached CSV file.",
    })
  })
})
