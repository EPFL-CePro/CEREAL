import { type SacStatus } from "@/types/sacStatus"

export const SAC_STATUS_LABELS: Record<SacStatus, string> = {
  not_treated: "Not yet treated",
  accepted: "Accepted",
  not_accepted: "Not accepted",
  on_hold: "On hold",
}
