"use server"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { getCrepExamById } from "@/app/lib/crep/database"
import { getExamContact } from "@/app/lib/crep/exam-files"
import { formatDateOnlyValue } from "@/app/lib/dates/date-time"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"
import { type AuthorizedPersons } from "@/types/user"

const isProdEnv = process.env.NODE_ENV !== "development"

// Crep exam must be already updated in database
export async function sendEmailExamReadyToPickUp(examId: string) {
  await requirePermission(Permission.CREP)

  const exam = await getCrepExamById(examId)
  if (!exam) throw new Error(`${examId} not found`)

  if (exam.status !== "finished") return // TODO - Centralize crep-exam-status

  // Not send email if not prod env
  if (!isProdEnv) return

  const contact = getExamContact(exam)
  const authorizedPersons = JSON.parse(exam.authorized_persons)
    .map((ap: AuthorizedPersons) => ap.email)
    .join(", ")

  await sendTemplatedMail("exam_ready_to_pickup", {
    examCode: exam.exam_code,
    description: exam.exam_name,
    boxes: exam.boxes,
    "contact.email": contact.email,
    authorizedPersons,
  })
}

export async function sendEmailExamReadyToPrint(examId: string) {
  await requirePermission(Permission.CREP)

  const exam = await getCrepExamById(examId)
  if (!exam) throw new Error(`${examId} not found`)

  if (exam.status !== "toPrint") return

  if (!isProdEnv) return

  const examURL = `https://cereal.epfl.ch/crep/?openExamId=${exam.id}&day=${formatDateOnlyValue(exam.print_date)}`

  await sendTemplatedMail("exam_ready_to_print", {
    examCode: exam.exam_code,
    description: exam.exam_name,
    examURL,
  })
}
