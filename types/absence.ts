import type { DiffExam } from "./diffExam"
import type { SacStatus } from "./sacStatus"

export type Absence = {
  id: string
  sciper: number
  first_name: string
  last_name: string
  certificate_date_from: Date
  certificate_date_to: Date
  certificate_file_name: string
  comment: string
  sac_status: SacStatus
  sac_remark: string
  created_at: Date
  deferred_exam_registrations: DiffExam[]
}

export type NewAbsence = Omit<
  Absence,
  "id" | "created_at" | "deferred_exam_registrations" | "sac_status"
>
