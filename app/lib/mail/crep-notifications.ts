"use server"

import {
  requirePermission,
  requireUser,
} from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { getCrepExamById } from "@/app/lib/crep/database"
import { getExamContact } from "@/app/lib/crep/exam-files"
import { describeFile } from "@/app/lib/crep/file-specs"
import { MIN_BUSINESS_DAYS_BEFORE_DELIVERY } from "@/app/lib/dates/business-days"
import { formatDateOnlyValue } from "@/app/lib/dates/date-time"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"
import { type AuthorizedPersons } from "@/types/user"

const isProdEnv =
  process.env.NODE_ENV !== "development" || process.env.MAIL_ENABLED === "true"

// Crep exam must be already updated in database
export async function sendEmailExamReadyToPickUp(crepExamId: string) {
  await requirePermission(Permission.CREP)

  const exam = await getCrepExamById(crepExamId)

  if (!exam) throw new Error(`${crepExamId} not found`)
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

export async function sendEmailExamReadyToPrint(crepExamId: string) {
  await requirePermission(Permission.CREP)

  const exam = await getCrepExamById(crepExamId)

  if (!exam) throw new Error(`${crepExamId} not found`)
  if (exam.status !== "toPrint") return
  if (!isProdEnv) return

  // TODO - Set base URL in the .env APP_URL
  const examURL = `https://cereal.epfl.ch/crep/?openExamId=${exam.id}&day=${formatDateOnlyValue(exam.print_date)}`

  await sendTemplatedMail("exam_ready_to_print", {
    examCode: exam.exam_code,
    description: exam.exam_name,
    examURL,
  })
}

/*
    The mail checks if status is `registered-warning` or `registered-error`, and displays a message for the user and the CePro team to let them know about the exam printing situation.
    If the status is `registered-warning`, that means that a printing schedule could be found, but that the timing is too short (less than `MIN_BUSINESS_DAYS_BEFORE_DELIVERY` business days between today and the desired delivery date)
    If the status is `registered-error`, that means that a printing schedule could NOT be found, so the CePro (and Repro) team need to do something for the user.
*/
export async function sendEmailCrepPrintingConfirmation(crepExamId: string) {
  const user = await requireUser()

  const exam = await getCrepExamById(crepExamId)

  if (!exam) throw new Error(`${crepExamId} not found`)
  if (!user.email || exam.registered_by !== user.email) return

  // Calcul exam-status
  const isError = exam.status === "registered-error"
  const attentionRequired = isError || exam.status === "registered-warning"
  // The text lines stay at column 0: in a template literal, the indentation would be part of the mail
  const attentionBlock = attentionRequired
    ? `
⚠️ : ${
        isError
          ? `Due to a printing planning extremely full or too tight delays, we could not determine a printing session for your exam.
The CePro team will get in touch with you as soon as possible to discuss about your situation.`
          : `We would like to inform you that you choose a desired delivery date that is inferior to ${MIN_BUSINESS_DAYS_BEFORE_DELIVERY} business days from today.
The CePro team will get in touch with you shortly to discuss about your situation.
Next time, please register to the printing service earlier to make sur that the printing team has the right amount of time to print your exam correctly.`
      }
`
    : ""

  const contact = getExamContact(exam)
  const authorizedPersons: AuthorizedPersons[] = JSON.parse(
    exam.authorized_persons,
  )

  if (!isProdEnv) return

  await sendTemplatedMail("crep_printing_confirmation", {
    attentionPrefix: attentionRequired ? "REQUIRES ATTENTION - " : "",
    attentionBlock,
    course: `${exam.exam_code} - ${exam.exam_name}`,
    examDate: formatDateOnlyValue(exam.exam_date),
    desiredDate: formatDateOnlyValue(exam.desired_date),
    contact: `${contact?.firstname} ${contact?.lastname} (${contact?.email})`,
    authorizedPersonsLine:
      authorizedPersons.length > 0
        ? `- Authorized persons: ${authorizedPersons.map((user) => `${user.email}`).join(", ")}`
        : "",
    files: exam.files.map((file) => `\n    - ${describeFile(file)}`).join(""),
    remarkLine: exam.remark ? `- Additional remarks: ${exam.remark}` : "",
    "registrant.email": user.email,
  })
}
