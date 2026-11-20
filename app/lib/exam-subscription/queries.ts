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

// One exam per row. Returns the ids of the created exams.
export async function createSubscribedExams(
  exams: NewSubscribedExam[],
): Promise<number[]> {
  const created = await prisma.$transaction(
    exams.map((data) => prisma.exam.create({ data, select: { id: true } })),
  )
  return created.map((exam) => exam.id)
}
