import "server-only"
import { examBlockingPrintStatus } from "@/app/lib/crep/exam-status"
import { prisma } from "@/app/lib/prisma"
import { type CrepExam } from "@/types/crepExam"

export type PrintSlot = Pick<CrepExam, "print_date" | "print_duration">

/**
 * Printings that occupy the printer between @from and @until (excluded)
 * @param from
 * @param until
 */
export async function getBlockingExamsBetweenDates(
  from: Date,
  until: Date,
): Promise<PrintSlot[]> {
  return await prisma.crep.findMany({
    where: {
      print_date: { gte: from, lt: until },
      status: { in: examBlockingPrintStatus },
    },
    select: {
      print_date: true,
      print_duration: true,
    },
  })
}
