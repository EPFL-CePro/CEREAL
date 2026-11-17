import { type DiffExam } from "@/types/diffExam"

// "22/06/2026 15:15–18:45" (times are missing for registrations made before they were stored)
export function formatExamSchedule(exam: DiffExam) {
  const date = new Date(exam.exam_date).toLocaleDateString("fr-FR")
  if (!exam.exam_start_time || !exam.exam_end_time) return date
  return `${date} ${exam.exam_start_time}–${exam.exam_end_time}`
}
