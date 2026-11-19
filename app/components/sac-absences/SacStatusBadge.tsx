import { SAC_STATUS_LABELS } from "@/app/lib/sac/sac-status"
import { type SacStatus } from "@/types/sacStatus"

const SAC_STATUS_CLASSES: Record<SacStatus, string> = {
  not_treated: "bg-gray-100 text-gray-700",
  accepted: "bg-green-100 text-green-800",
  not_accepted: "bg-red-100 text-red-800",
  on_hold: "bg-amber-100 text-amber-800",
}

export function SacStatusBadge({ status }: { status: SacStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${SAC_STATUS_CLASSES[status]}`}
    >
      {SAC_STATUS_LABELS[status]}
    </span>
  )
}
