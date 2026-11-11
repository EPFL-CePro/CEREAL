export type DeferredSession = {
  id: number
  name: string
  is_active: boolean
  created_at: Date
}

export type NewDeferredSession = Omit<
  DeferredSession,
  "id" | "created_at"
>
