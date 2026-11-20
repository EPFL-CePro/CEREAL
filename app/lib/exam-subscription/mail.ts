import "server-only"

import { formatDateOnlyValue } from "@/app/lib/dates/date-time"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"

// Emails are always sent outside development, and in development only if MAIL_ENABLED=true
const isMailEnabled =
  process.env.NODE_ENV !== "development" || process.env.MAIL_ENABLED === "true"

// DTO: everything the email needs, already resolved
export type ExamSubscriptionEmail = {
  courseCode: string
  teacherEmails: string[]
  contactEmail: string
  registrantEmail: string
  service: string
  serviceLevel: string
  exams: { examType: string; date: Date | null }[]
  remark: string | null
}

export async function sendExamSubscriptionConfirmation(
  email: ExamSubscriptionEmail,
) {
  if (!isMailEnabled) return

  await sendTemplatedMail("exam_services_confirmation", {
    course: email.courseCode,
    teachers: email.teacherEmails.join(", "),
    contactEmail: email.contactEmail,
    examTypes: email.exams.map((exam) => exam.examType).join(", "),
    service: email.service,
    serviceLevel: email.serviceLevel,
    examDates: email.exams
      .map(
        (exam) =>
          `    - ${exam.examType} : ${exam.date ? formatDateOnlyValue(exam.date) : "Don't know yet"}`,
      )
      .join("\n"),
    remark: email.remark ?? "",
    "registrant.email": email.registrantEmail,
  })
}
