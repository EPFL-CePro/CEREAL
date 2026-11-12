"use server"

import { requireUser } from "@/app/lib/auth/require-permission"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"

const isProdEnv = process.env.NODE_ENV !== "development"

// TODO - sendEmailAbsenceConfirmation, sendEmailExamServicesConfirmation

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
