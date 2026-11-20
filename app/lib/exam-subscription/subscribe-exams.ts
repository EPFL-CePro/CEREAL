"use server"

import { z } from "zod"

import { requireUser } from "@/app/lib/auth/require-permission"
import { getCurrentAcademicYear } from "@/app/lib/dates/academic-year"
import {
  fetchCourseTeacherEmails,
  fetchPersonBySciper,
} from "@/app/lib/epfl/epfl-api"
import { sendExamSubscriptionConfirmation } from "@/app/lib/exam-subscription/mail"
import {
  createSubscribedExams,
  type NewSubscribedExam,
  type SubscribedExam,
} from "@/app/lib/exam-subscription/queries"
import { examSubscriptionSchema } from "@/app/lib/exam-subscription/schema"
import { type ActionResult } from "@/types/actionResult"
import { type Exam } from "@/types/exam"

// TODO - Silver by default for everyone
const DEFAULT_SERVICE_LEVEL_ID = 2
const DEFAULT_EXAM_STATUS_ID = 2

export async function subscribeExams(input: unknown): Promise<ActionResult> {
  const user = await requireUser()

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
  const academicYear = getCurrentAcademicYear()
  let contact: Exam["contact"]
  let exams: SubscribedExam[]
  try {
    const person = await fetchPersonBySciper(data.contact)
    contact = {
      firstname: person.firstname ?? "",
      lastname: person.lastname ?? "",
      email: person.email ?? "",
      sciper: String(person.id ?? data.contact),
    }

    exams = await createSubscribedExams(
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
    const teacherEmails = await fetchCourseTeacherEmails(
      data.courseCode,
      data.courseName,
      academicYear,
    )
    // All the exams share the same service and service level
    const [firstExam] = exams
    await sendExamSubscriptionConfirmation({
      courseCode: data.courseCode,
      teacherEmails,
      contactEmail: contact.email,
      registrantEmail: user.email ?? "",
      service: firstExam.service?.description ?? "",
      serviceLevel: firstExam.service_level?.name ?? "",
      exams: exams.map((exam) => ({
        examType: exam.exam_type?.name ?? "",
        date: exam.exam_date,
      })),
      remark: data.remark || null,
    })
  } catch (err) {
    console.error(
      `[subscribeExams] Confirmation email failed for exams ${exams.map((exam) => exam.id).join(", ")}`,
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
