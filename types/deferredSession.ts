import { type Teacher } from "./teacher"

export type DeferredExamSlot = "morning" | "afternoon"

export type DeferredSession = {
  id: number
  name: string
  is_active: boolean
  created_at: Date
  days: DeferredSessionDay[]
}

export type DeferredSessionDay = {
  id: number
  session_id: number
  date: Date
  exams: DeferredSessionExam[]
}

export type DeferredSessionExam = {
  id: number
  day_id: number
  session_id: number
  exam_code: string
  exam_name: string
  teachers: Teacher[]
  slot: DeferredExamSlot
}

export type NewDeferredSessionDay = Omit<DeferredSessionDay, "id" | "exams">

// day_id and session_id don't exist yet when the session is created
export type NewDeferredSessionExam = Omit<
  DeferredSessionExam,
  "id" | "day_id" | "session_id"
>

// session_id doesn't exist yet when the session is created
export type NewDeferredSession = Omit<
  DeferredSession,
  "id" | "created_at" | "days"
> & {
  days: (Omit<NewDeferredSessionDay, "session_id"> & {
    exams: NewDeferredSessionExam[]
  })[]
}
