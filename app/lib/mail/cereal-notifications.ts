"use server"

import { requireUser } from "@/app/lib/auth/require-permission"
import { formatDateOnlyValue } from "@/app/lib/dates/date-time"
import { fetchCourses, fetchPersonBySciper } from "@/app/lib/epfl/epfl-api"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"
import { prisma } from "@/app/lib/prisma"

const isProdEnv = process.env.NODE_ENV !== "development"

// TODO - sendEmailAbsenceConfirmation

function formatPapersManagement(papersManagement: string) {
  if (papersManagement === "repro_collect") {
    return "The exam papers are at the printing centre and I will come and collect them shortly."
  }
  if (papersManagement === "repro_destroy") {
    return "The exam papers are at the printing centre and may be destroyed by CePro."
  }
  if (papersManagement === "papers_user") {
    return "The exam papers are in my possession and I will take care of them."
  }
}

// Sent after the upload: the recipient is always the logged-in user (+ CePro in cc)
export async function sendEmailArchivingConfirmation(archive: {
  courseName: string
  academicYear: string
  pdfsNumber: number
  papersManagement: string
  nasPath: string
}) {
  const user = await requireUser()

  if (!user.email) return
  if (!isProdEnv) return

  await sendTemplatedMail("archiving_confirmation", {
    "registrant.email": user.email,
    courseName: archive.courseName,
    academicYear: archive.academicYear,
    pdfsNumber: archive.pdfsNumber,
    papersManagement: formatPapersManagement(archive.papersManagement),
    nasPath: archive.nasPath,
  })
}

export async function sendEmailExamServicesConfirmation(examIds: number[]) {
  const user = await requireUser()
  // TODO - Extract in a dedicated function in data layout
  const exams = await prisma.exam.findMany({
    where: { id: { in: examIds } },
    include: { exam_type: true, service: true },
    orderBy: { id: "asc" },
  })
  const firstExam = exams[0]

  // One subscription = one course
  if (
    !firstExam?.code ||
    exams.length !== examIds.length ||
    exams.some((exam) => exam.code !== firstExam.code)
  ) {
    throw new Error("Invalid exams")
  }

  if (!isProdEnv) return

  // Same teachers as the form
  const courses = await fetchCourses(firstExam.academic_year_id ?? undefined)
  const course = courses.find(
    (c) => c.exam.code === firstExam.code && c.exam.title === firstExam.name,
  )

  const teachers = await Promise.all(
    (course?.exam.teachers ?? [])
      .filter((teacher) => teacher.sciper)
      .map((teacher) => fetchPersonBySciper(String(teacher.sciper))),
  )

  const contact = (firstExam.contact ?? {}) as { email?: string }

  await sendTemplatedMail("exam_services_confirmation", {
    course: firstExam.code,
    teachers: teachers
      .filter((teacher) => teacher.email)
      .map((teacher) => teacher.email)
      .join(", "),
    contactEmail: contact.email,
    examTypes: exams.map((exam) => exam.exam_type?.name).join(", "),
    service: firstExam.service?.description,
    serviceLevel: "Silver",
    examDates: exams
      .map(
        (exam) =>
          `    - ${exam.exam_type?.name} : ${exam.exam_date ? formatDateOnlyValue(exam.exam_date) : `Don't know yet`}`,
      )
      .join("\n"),
    remark: firstExam.remark,
    "registrant.email": user.email || "",
  })
}
