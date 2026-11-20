"use server"

import { z } from "zod"

import { requireUser } from "@/app/lib/auth/require-permission"
import { getCurrentAcademicYear } from "@/app/lib/dates/academic-year"
import { fetchPersonBySciper } from "@/app/lib/epfl/epfl-api"
import {
  createSubscribedExams,
  type NewSubscribedExam,
} from "@/app/lib/exam-subscription/queries"
import { examSubscriptionSchema } from "@/app/lib/exam-subscription/schema"
import { sendEmailExamServicesConfirmation } from "@/app/lib/mail/cereal-notifications"
import { type Exam } from "@/types/exam"

// TODO - Silver by default for everyone
const DEFAULT_SERVICE_LEVEL_ID = 2
const DEFAULT_EXAM_STATUS_ID = 2

type ActionResult =
  | { success: true; warning?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function subscribeExams(input: unknown): Promise<ActionResult> {
  await requireUser()

  // Business rules
  const parsed = examSubscriptionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please check the form for errors.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }
  const data = parsed.data

  // Enrich and insert
  let examIds: number[]
  try {
    const person = await fetchPersonBySciper(data.contact)
    const contact: Exam["contact"] = {
      firstname: person.firstname ?? "",
      lastname: person.lastname ?? "",
      email: person.email ?? "",
      sciper: String(person.id ?? data.contact),
    }
    const academicYear = getCurrentAcademicYear()

    examIds = await createSubscribedExams(
      data.examTypes.map((examType): NewSubscribedExam => ({
        code: data.courseCode,
        name: data.courseName,
        service_level_id: DEFAULT_SERVICE_LEVEL_ID,
        service_id: data.serviceId,
        exam_type_id: examType.examTypeId,
        exam_status_id: DEFAULT_EXAM_STATUS_ID,
        exam_date: examType.date ? new Date(examType.date) : null,
        academic_year_id: academicYear,
        exam_semester: data.semester,
        remark: data.remark || null,
        contact,
      })),
    )
  } catch (err) {
    console.error("[subscribeExams] Registration failed", err)
    return {
      success: false,
      error:
        "An error occurred while registering your exam. Please try again later.",
    }
  }

  // Email: the exams are already saved, so a failure is only a warning
  try {
    await sendEmailExamServicesConfirmation(examIds)
  } catch (err) {
    console.error(
      `[subscribeExams] Confirmation email failed for exams ${examIds.join(", ")}`,
      err,
    )
    return {
      success: true,
      warning:
        "Your exam has been registered, but the confirmation email could not be sent.",
    }
  }

  return { success: true }
}
