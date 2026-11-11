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
}

export type NewDeferredSessionDay = Omit<DeferredSessionDay, "id">

// session_id doesn't exist yet when the session is created
export type NewDeferredSession = Omit<
  DeferredSession,
  "id" | "created_at" | "days"
> & {
  days: Omit<NewDeferredSessionDay, "session_id">[]
}
