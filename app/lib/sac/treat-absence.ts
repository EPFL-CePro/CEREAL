"use server"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { sendEmailAbsenceTreated } from "@/app/lib/mail/cereal-notifications"
import { prisma } from "@/app/lib/prisma"
import { type SacStatus } from "@/types/sacStatus"

// Final decision, also used for each deferred exam registration
export type SacDecision = "accepted" | "not_accepted"

// "on_hold": the SAC waits for more information, the absence can be treated later
export type AbsenceDecision = SacDecision | "on_hold"

export type RegistrationDecision = {
  id: number
  status: SacDecision
}

// An absence can still be treated as long as no final decision has been taken
const TREATABLE_STATUSES: SacStatus[] = ["not_treated", "on_hold"]

function isSacDecision(value: unknown): value is SacDecision {
  return value === "accepted" || value === "not_accepted"
}

/*
 Treats an absence once and for all (the decision cannot be changed afterwards):
 - refused: the absence and all its deferred exam registrations become "not_accepted"
 - accepted: each linked registration must have its own decision
 Then sends the email to the student. The decision is kept even if the email fails,
 `emailSent` tells the caller whether it has been sent.
 An absence can first be put "on_hold" (no email, registrations untouched) and treated later.
*/
export async function treatAbsence(
  absenceId: number,
  decision: AbsenceDecision,
  registrationDecisions: RegistrationDecision[],
): Promise<{ emailSent: boolean }> {
  await requirePermission(Permission.SAC)
  if (!Number.isInteger(absenceId)) throw new Error("Invalid absence")

  const absence = await prisma.exam_student_absence.findUnique({
    where: { id: absenceId },
    include: { deferred_exam_registration: { select: { id: true } } },
  })
  if (!absence) throw new Error("Absence not found")
  if (!TREATABLE_STATUSES.includes(absence.sac_status)) {
    throw new Error("Absence already treated")
  }

  if (decision === "on_hold") {
    await prisma.exam_student_absence.updateMany({
      where: { id: absenceId, sac_status: { in: TREATABLE_STATUSES } },
      data: { sac_status: "on_hold" },
    })
    return { emailSent: false }
  }
  if (!isSacDecision(decision)) throw new Error("Invalid decision")
  const isAccepted = decision === "accepted"

  const registrationIds = absence.deferred_exam_registration.map(({ id }) => id)

  if (isAccepted) {
    const decidedIds = new Set(registrationDecisions.map(({ id }) => id))
    const isEveryRegistrationDecided =
      registrationDecisions.length === registrationIds.length &&
      decidedIds.size === registrationIds.length &&
      registrationIds.every((id) => decidedIds.has(id)) &&
      registrationDecisions.every(({ status }) => isSacDecision(status))

    if (!isEveryRegistrationDecided) {
      throw new Error("Each deferred exam registration must be decided")
    }
  }

  const idsWithStatus = (wantedStatus: SacDecision) =>
    registrationDecisions
      .filter(({ status }) => status === wantedStatus)
      .map(({ id }) => id)

  await prisma.$transaction(async (tx) => {
    // The status condition prevents treating (and emailing) the same absence twice
    const { count } = await tx.exam_student_absence.updateMany({
      where: { id: absenceId, sac_status: { in: TREATABLE_STATUSES } },
      data: { sac_status: decision },
    })
    if (count === 0) throw new Error("Absence already treated")

    if (!isAccepted) {
      await tx.deferred_exam_registration.updateMany({
        where: { exam_student_absence_id: absenceId },
        data: { sac_status: "not_accepted" },
      })
      return
    }

    for (const status of ["accepted", "not_accepted"] as const) {
      await tx.deferred_exam_registration.updateMany({
        where: {
          exam_student_absence_id: absenceId,
          id: { in: idsWithStatus(status) },
        },
        data: { sac_status: status },
      })
    }
  })

  try {
    await sendEmailAbsenceTreated(absenceId)
    return { emailSent: true }
  } catch (error) {
    console.error(error)
    return { emailSent: false }
  }
}
