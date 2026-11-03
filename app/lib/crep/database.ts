"use server"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { getAcademicYearDateRange } from "@/app/lib/dates/academic-year"
import { type CrepExam, type CrepFileSpecs } from "@/types/crepExam"

import { examBlockingPrintStatus, examNotAdminStatus } from "./exam-status"
import { getTotalCopies, pickFileSpecs, validateFilesSpecs } from "./file-specs"
import { getPrintingDurationInMinutes } from "./print-duration"

import { type crep_log, type Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/app/lib/prisma"

type NewCrepFile = CrepFileSpecs & { file_name: string | null }

// Adds the files (table `crep_file`) of every exam to `exam.files`
const withFiles = {
  crep_file: { orderBy: { id: "asc" } },
} satisfies Prisma.crepInclude

type CrepWithFiles = Prisma.crepGetPayload<{ include: typeof withFiles }>

// Renames the `crep_file` relation to `files`, the name used by CrepExam
function toCrepExam({ crep_file, ...exam }: CrepWithFiles): CrepExam {
  return { ...exam, files: crep_file } as CrepExam
}

// `contact` is a JSON string stored in a MEDIUMTEXT column: Prisma cannot filter on it
async function getCrepIdsByContactEmail(email: string): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM crep WHERE JSON_UNQUOTE(JSON_EXTRACT(contact, '$.email')) = ${email}
  `
  return rows.map((row) => row.id)
}

async function insertFiles(
  tx: Prisma.TransactionClient,
  crepId: number,
  files: NewCrepFile[],
) {
  await tx.crep_file.createMany({
    data: files.map((file) => ({
      crep_id: crepId,
      file_name: file.file_name,
      ...pickFileSpecs(file),
    })),
  })
}

// Recomputes `crep.print_duration` from the copies of all the files of the exam, returns the new duration
async function refreshPrintDuration(
  tx: Prisma.TransactionClient,
  crepId: number,
): Promise<number> {
  const { _sum } = await tx.crep_file.aggregate({
    where: { crep_id: crepId },
    _sum: { exam_students: true },
  })
  const printDuration = getPrintingDurationInMinutes(_sum.exam_students ?? 0)
  await tx.crep.update({
    where: { id: crepId },
    data: { print_duration: printDuration },
  })
  return printDuration
}

export async function getAllCrepExams() {
  await requirePermission(Permission.CREP)
  const rows = await prisma.crep.findMany({ include: withFiles })
  return rows.map(toCrepExam)
}

export async function getAllCrepExamsForRepro(email: string) {
  await requirePermission(Permission.CREP)
  const ids = await getCrepIdsByContactEmail(email)
  const rows = await prisma.crep.findMany({
    where: { OR: [{ status: "toPrint" }, { id: { in: ids } }] },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

export async function getOldestCrepExamDate(): Promise<Date | null> {
  await requirePermission(Permission.CREP)
  const result = await prisma.crep.aggregate({ _min: { exam_date: true } })
  return result._min.exam_date
}

export async function getCrepExamsByAcademicYear(
  academicYear: string,
): Promise<CrepExam[]> {
  await requirePermission(Permission.CREP)
  const range = getAcademicYearDateRange(academicYear)
  if (!range) return []

  const rows = await prisma.crep.findMany({
    where: { exam_date: { gte: range.start, lt: range.end } },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

export async function getAllNonAdminExams() {
  await requirePermission(Permission.CREP)
  const allowedStatuses = [
    ...examNotAdminStatus.map((status) => status.value),
    "reserved",
  ]

  const rows = await prisma.crep.findMany({
    where: { status: { in: allowedStatuses } },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

export async function updateExamDateById(id: string, startDate: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.crep.update({
    where: { id: Number(id) },
    // `startDate` is a wall-clock "YYYY-MM-DD HH:mm:ss", read as UTC like every DATETIME by Prisma
    data: { print_date: new Date(`${startDate.replace(" ", "T")}Z`) },
  })
}

export async function updateExamStatusById(id: string, status: string) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(id) },
    data: { status },
  })
}

export async function updateExamRemarkById(id: string, remark: string) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(id) },
    data: { remark },
  })
}

export async function updateExamReproRemarkById(
  id: string,
  reproRemark: string,
) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(id) },
    data: { repro_remark: reproRemark },
  })
}

export async function getAllExamsByStatus(
  status: Array<string>,
): Promise<CrepExam[]> {
  await requirePermission(Permission.CREP)
  const rows = await prisma.crep.findMany({
    where: { status: { in: status } },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

export async function getAllExamsBetweenDates(
  beginDate: Date,
  endDate: Date,
): Promise<CrepExam[]> {
  const rows = await prisma.crep.findMany({
    where: { print_date: { gte: beginDate, lte: endDate } },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

// No permission check on purpose: used by the register form (every logged-in user).
export async function insertExamForPrint(
  exam: {
    exam_code: string
    exam_date: string
    exam_name: string
    print_date: string
    contact: string
    authorized_persons: string
    remark?: string | null
    repro_remark?: string | null
    status?: string
    registered_by: string
    financial_center: string
    desired_date: string
  },
  files: NewCrepFile[],
): Promise<number> {
  if (files.length === 0) throw new Error("An exam needs at least one file")
  const filesError = validateFilesSpecs(files)
  if (filesError) throw new Error(filesError)

  return prisma.$transaction(async (tx) => {
    const created = await tx.crep.create({
      data: {
        exam_code: exam.exam_code,
        exam_date: new Date(exam.exam_date),
        exam_name: exam.exam_name,
        // `print_date` is a wall-clock "YYYY-MM-DD HH:mm:ss", read as UTC like every DATETIME by Prisma
        print_date: new Date(`${exam.print_date.replace(" ", "T")}Z`),
        print_duration: getPrintingDurationInMinutes(getTotalCopies(files)),
        contact: exam.contact,
        authorized_persons: exam.authorized_persons,
        remark: exam.remark || null,
        repro_remark: exam.repro_remark || null,
        status: exam.status || "registered",
        registered_by: exam.registered_by,
        financial_center: exam.financial_center,
        desired_date: new Date(exam.desired_date),
      },
    })

    // The files inserted at registration are not logged one by one (see the `crep_file_after_insert` trigger)
    await tx.$executeRaw`SET @crep_registering = 1`
    try {
      await insertFiles(tx, created.id, files)
    } finally {
      // A session variable stays on the connection given back to the pool: it must never be left set
      await tx.$executeRaw`SET @crep_registering = NULL`
    }

    return created.id
  })
}

export async function addCrepFiles(
  crepId: number,
  files: NewCrepFile[],
): Promise<void> {
  const filesError = validateFilesSpecs(files)
  if (filesError) throw new Error(filesError)

  await prisma.$transaction(async (tx) => {
    await insertFiles(tx, crepId, files)
    await refreshPrintDuration(tx, crepId)
  })
}

// Only updates the print settings of the files, returns the printing duration of the exam
export async function updateCrepFileSpecs(
  crepId: number,
  files: (CrepFileSpecs & { id: number })[],
): Promise<number> {
  await requirePermission(Permission.CREP)
  const filesError = validateFilesSpecs(files)
  if (filesError) throw new Error(filesError)

  return prisma.$transaction(async (tx) => {
    const currentFiles = await tx.crep_file.findMany({
      where: { crep_id: crepId },
      select: { id: true, exam_students: true },
    })
    let copiesChanged = false

    for (const file of files) {
      const specs = pickFileSpecs(file)
      const currentFile = currentFiles.find(({ id }) => id === file.id)
      if (!currentFile) continue
      if (currentFile.exam_students !== specs.exam_students)
        copiesChanged = true

      await tx.crep_file.update({ where: { id: file.id }, data: specs })
    }

    // The duration is only recomputed if the copies changed, so that the frozen duration of the migrated exams is kept
    if (copiesChanged) return refreshPrintDuration(tx, crepId)

    const exam = await tx.crep.findUniqueOrThrow({
      where: { id: crepId },
      select: { print_duration: true },
    })
    return exam.print_duration
  })
}

export async function deleteCrepFile(
  crepId: number,
  fileId: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.crep_file.deleteMany({ where: { id: fileId, crep_id: crepId } })
    await refreshPrintDuration(tx, crepId)
  })
}

export async function getBlockingExamsForDate(
  date: string,
): Promise<CrepExam[]> {
  const dayStart = new Date(`${date}T00:00:00Z`)
  const nextDay = new Date(dayStart)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  const rows = await prisma.crep.findMany({
    where: {
      print_date: { gte: dayStart, lt: nextDay },
      status: { in: examBlockingPrintStatus },
    },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

export async function deleteCrepExam(examId: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.crep.delete({ where: { id: Number(examId) } })
}

export async function updateCrepBoxes(examId: string, boxes: string) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(examId) },
    data: { boxes: Number(boxes) },
  })
}

export async function updateCrepPriceUnit(examId: string, priceUnit: string) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(examId) },
    data: { price_unit: Number(priceUnit) },
  })
}

export async function updateCrepPriceTotal(examId: string, priceTotal: string) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(examId) },
    data: { price_total: Number(priceTotal) },
  })
}

export async function updateCrepExamFields(
  examId: string,
  fields: {
    desired_date: string
    exam_date: string
    financial_center: string
    authorized_persons: string
    order_number: string
  },
) {
  await requirePermission(Permission.CREP)
  await prisma.crep.update({
    where: { id: Number(examId) },
    data: {
      desired_date: new Date(fields.desired_date),
      exam_date: new Date(fields.exam_date),
      financial_center: fields.financial_center,
      authorized_persons: fields.authorized_persons,
      order_number: fields.order_number,
    },
  })
}

export async function getCrepExamsByContactEmail(
  email: string,
): Promise<CrepExam[]> {
  const ids = await getCrepIdsByContactEmail(email)
  const rows = await prisma.crep.findMany({
    where: { id: { in: ids } },
    orderBy: { desired_date: "desc" },
    include: withFiles,
  })
  return rows.map(toCrepExam)
}

export async function getCrepExamById(id: string): Promise<CrepExam | null> {
  const crepId = Number(id)
  if (!Number.isInteger(crepId)) return null
  const exam = await prisma.crep.findUnique({
    where: { id: crepId },
    include: withFiles,
  })
  return exam ? toCrepExam(exam) : null
}

type LogRow = Omit<crep_log, "changes"> & {
  changes: unknown
  read_at: Date | null
}

export async function getLogs(sciper: string) {
  await requirePermission(Permission.CREP)
  const rows = await prisma.$queryRaw<LogRow[]>`
    SELECT l.*, un.read_at
    FROM crep_log l
    LEFT JOIN user_notification un ON un.log_id = l.id AND un.sciper = ${sciper}
    ORDER BY l.date_time DESC, l.id DESC
  `
  return rows.map((row) => ({ ...row, is_read: row.read_at !== null }))
}

export async function markAsRead(sciper: string) {
  await requirePermission(Permission.CREP)
  await prisma.$executeRaw`
    INSERT INTO user_notification (log_id, sciper, read_at)
    SELECT l.id, ${sciper}, CURRENT_TIMESTAMP(6) FROM crep_log l
    ON DUPLICATE KEY UPDATE read_at = IF(user_notification.read_at IS NULL, CURRENT_TIMESTAMP(6), user_notification.read_at)
  `
  return { ok: true }
}
