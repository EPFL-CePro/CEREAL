import type { SacStatus } from "./sacStatus"

export type DiffExam = {
  id: string
  exam_student_absence_id: number
  exam_code: string
  exam_name: string
  exam_date: Date
  isa_has_grade: boolean
  sac_status: SacStatus
  sac_remark: string
}

export type NewDiffExam = Omit<DiffExam, "id" | "sac_status" | "sac_remark">
