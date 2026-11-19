import type { DeferredSessionExam } from "./deferredSession"
import type { SacStatus } from "./sacStatus"

// A deferred exam registration with the student who made it
export type TrackedRegistration = {
  id: number
  exam_code: string
  exam_name: string
  exam_date: Date // Date of the ordinary exam the student missed
  sac_status: SacStatus
  sciper: number
  first_name: string
  last_name: string
}

// "on_hold" registrations are counted with the "not_treated" ones
export type RegistrationCounts = {
  accepted: number
  notTreated: number
}

export type TrackedExam = DeferredSessionExam & {
  registrations: TrackedRegistration[]
  counts: RegistrationCounts
  // null when the exam is not in the BO file: its ordinary date is unknown
  isRegistrationOpen: boolean | null
}

export type TrackedDay = {
  id: number
  date: Date
  exams: TrackedExam[]
  counts: RegistrationCounts
}

export type DeferredSessionTracking = {
  id: number
  name: string
  days: TrackedDay[]
  // Registrations to an exam that is not planned in the session
  unmatched: TrackedRegistration[]
}
