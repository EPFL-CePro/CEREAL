import "server-only"

import { prisma } from "@/app/lib/prisma"
import { type Exam } from "@/types/exam"

// DTO of one exam created by a subscription
export type NewSubscribedExam = {
  code: string
  name: string
  service_level_id: number
  service_id: number
  exam_type_id: number
  exam_status_id: number
  exam_date: Date | null // null = "I don't know yet"
  academic_year_id: string
  exam_semester: "1" | "2"
  remark: string | null
  contact: Exam["contact"]
}

// One created exam, with the labels needed by the confirmation email
export type SubscribedExam = {
  id: number
  exam_date: Date | null
  exam_type: { name: string | null } | null
  service: { description: string | null } | null
  service_level: { name: string | null } | null
}

// One exam per row, all or nothing.
export async function createSubscribedExams(
  exams: NewSubscribedExam[],
): Promise<SubscribedExam[]> {
  return prisma.$transaction(
    exams.map((data) =>
      prisma.exam.create({
        data,
        select: {
          id: true,
          exam_date: true,
          exam_type: { select: { name: true } },
          service: { select: { description: true } },
          service_level: { select: { name: true } },
        },
      }),
    ),
  )
}
