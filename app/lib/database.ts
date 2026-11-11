"use server"
import { requirePermission } from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { EMAIL_TEMPLATES } from "@/app/lib/mail/email-templates"
import { prisma } from "@/app/lib/prisma"
import { type Comment } from "@/types/comment"
import { type EmailTemplate } from "@/types/emailTemplate"
import { type Exam, type NewExam } from "@/types/exam"
import { type ExamStatus } from "@/types/examStatus"
import { type ExamType } from "@/types/examType"
import { type Service } from "@/types/service"
import { type ServiceLevel } from "@/types/serviceLevel"

import type { Absence, NewAbsence } from "@/types/absence"
import type { NewDiffExam } from "@/types/diffExam"
import { DeferredSession, NewDeferredSession } from "@/types/deferredSession"

// No permission check on purpose: reference data used by the teachers form too (every logged-in user).
export async function getAllServices(): Promise<Service[]> {
  return (await prisma.service.findMany()) as Service[]
}

export async function insertService(
  service: Omit<Service, "id">,
): Promise<number> {
  await requirePermission(Permission.ADMIN)
  const created = await prisma.service.create({
    data: { code: service.code, description: service.description },
  })
  return created.id
}

export async function deleteService(service: Service): Promise<void> {
  await requirePermission(Permission.ADMIN)
  await prisma.service.delete({ where: { id: service.id } })
}

export async function insertServiceLevel(
  serviceLevel: Omit<ServiceLevel, "id">,
): Promise<number> {
  await requirePermission(Permission.ADMIN)
  const created = await prisma.service_level.create({
    data: { code: serviceLevel.code, name: serviceLevel.name },
  })
  return created.id
}

export async function deleteServiceLevel(
  serviceLevel: ServiceLevel,
): Promise<void> {
  await requirePermission(Permission.ADMIN)
  await prisma.service_level.delete({ where: { id: serviceLevel.id } })
}

export async function insertExamStatus(
  examStatus: Omit<ExamStatus, "id">,
): Promise<number> {
  await requirePermission(Permission.ADMIN)
  const created = await prisma.exam_status.create({
    data: { code: examStatus.code, name: examStatus.name },
  })
  return created.id
}

export async function deleteExamStatus(examStatus: ExamStatus): Promise<void> {
  await requirePermission(Permission.ADMIN)
  await prisma.exam_status.delete({ where: { id: examStatus.id } })
}

// No permission check on purpose: reference data used by the teachers form too (every logged-in user).
export async function getAllExamTypes(): Promise<ExamType[]> {
  return (await prisma.exam_type.findMany()) as ExamType[]
}

// No permission check on purpose: used by the teachers form (every logged-in user).
export async function insertExam(exam: NewExam): Promise<number> {
  const created = await prisma.exam.create({
    data: {
      code: exam.code,
      name: exam.name,
      service_level_id: exam.service_level_id,
      service_id: exam.service_id,
      exam_type_id: exam.exam_type_id,
      exam_status_id: exam.exam_status_id,
      exam_date: exam.exam_date ? new Date(exam.exam_date) : null,
      academic_year_id: exam.academic_year_id,
      exam_semester: String(exam.exam_semester),
      nb_students: exam.nb_students || null,
      nb_pages: exam.nb_pages || null,
      total_pages: exam.total_pages || null,
      remark: exam.remark || null,
      responsible_id: exam.responsible_id,
      contact: JSON.parse(exam.contact),
    },
  })
  return created.id
}

export async function getAcademicYearsFromExams(): Promise<string[]> {
  await requirePermission(Permission.ADMIN)
  const rows = await prisma.exam.findMany({
    where: { NOT: [{ academic_year_id: null }, { academic_year_id: "" }] },
    select: { academic_year_id: true },
    distinct: ["academic_year_id"],
    orderBy: { academic_year_id: "asc" },
  })
  return rows.map((row) => row.academic_year_id as string)
}

export async function getExamCountsByAcademicYearAndService(
  semester: number | null,
): Promise<{ academicYearId: string; serviceId: number; count: number }[]> {
  await requirePermission(Permission.ADMIN)
  const rows = await prisma.exam.groupBy({
    by: ["academic_year_id", "service_id"],
    where: {
      NOT: [
        { academic_year_id: null },
        { academic_year_id: "" },
        { service_id: null },
      ],
      ...(semester !== null ? { exam_semester: String(semester) } : {}),
    },
    _count: { _all: true },
    orderBy: { academic_year_id: "asc" },
  })
  return rows.map((row) => ({
    academicYearId: row.academic_year_id as string,
    serviceId: row.service_id as number,
    count: row._count._all,
  }))
}

export async function getCopyAndPageCountsByAcademicYear(
  semester: number | null,
): Promise<{ academicYearId: string; copies: number; pages: number }[]> {
  await requirePermission(Permission.ADMIN)
  const rows = await prisma.$queryRaw<
    { academic_year_id: string; copies: unknown; pages: unknown }[]
  >`
        SELECT academic_year_id,
                COALESCE(SUM(nb_students), 0) AS copies,
                COALESCE(SUM(nb_students * nb_pages), 0) AS pages
        FROM exam
        WHERE academic_year_id IS NOT NULL AND academic_year_id <> ''
          AND (${semester} IS NULL OR exam_semester = ${semester})
        GROUP BY academic_year_id
        ORDER BY academic_year_id ASC
    `
  return rows.map((row) => ({
    academicYearId: row.academic_year_id,
    copies: Number(row.copies),
    pages: Number(row.pages),
  }))
}

// No permission check on purpose: reference data used by the teachers form (every logged-in user).
export async function getServiceById(serviceId: string): Promise<Service[]> {
  return (await prisma.service.findMany({
    where: { id: Number(serviceId) },
  })) as Service[]
}

export async function getAllExams(): Promise<Exam[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.exam.findMany()) as unknown as Exam[]
}

export async function getExamById(examId: string): Promise<Exam[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.exam.findMany({
    where: { id: Number(examId) },
  })) as unknown as Exam[]
}

export async function getExamsByAcademicYear(
  academicYear: string,
): Promise<Exam[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.exam.findMany({
    where: { academic_year_id: academicYear },
  })) as unknown as Exam[]
}

export async function getAllServiceLevels(): Promise<ServiceLevel[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.service_level.findMany()) as ServiceLevel[]
}

export async function getAllExamStatus(): Promise<ExamStatus[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.exam_status.findMany()) as ExamStatus[]
}

/* ----- UPDATES DB FROM EXAM TABLE ----- */
export async function updateExamServiceLevel(
  examId: string,
  serviceLevelId: string,
) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { service_level_id: Number(serviceLevelId) },
  })
}

export async function updateExamService(examId: string, serviceId: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { service_id: Number(serviceId) },
  })
}

export async function updateExamType(examId: string, examTypeId: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { exam_type_id: Number(examTypeId) },
  })
}

export async function updateExamStatus(examId: string, examStatusId: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { exam_status_id: Number(examStatusId) },
  })
}

export async function updateExamDate(examId: string, examDate: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { exam_date: examDate ? new Date(examDate) : null },
  })
}

export async function updateExamStudentsNumber(
  examId: string,
  nbStudents: string,
) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { nb_students: nbStudents === "" ? null : Number(nbStudents) },
  })
}

export async function updateExamPagesNumber(examId: string, nbPages: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { nb_pages: nbPages === "" ? null : Number(nbPages) },
  })
}

export async function updateExamRemark(examId: string, remark: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { remark },
  })
}

export async function updateExamResponsible(
  examId: string,
  responsibleId: number | null,
) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.update({
    where: { id: Number(examId) },
    data: { responsible_id: responsibleId },
  })
}

export async function deleteExam(examId: string) {
  await requirePermission(Permission.ADMIN)
  await prisma.exam.delete({ where: { id: Number(examId) } })
}

// Reconcile the email_template table with the EMAIL_TEMPLATES registry, which is
// the source of truth:
//  - INSERT the templates that are actually missing (existing rows, including
//    admin customizations, are left untouched);
//  - DELETE the rows whose template_key is no longer in the registry (an email
//    removed from the code disappears from the DB and the admin UI).
// Adding/removing an email therefore only requires a registry change + call site,
// with no manual SQL in production. We insert only the missing rows (rather than
// INSERT IGNORE everything) so the common case writes nothing and does not burn
// AUTO_INCREMENT ids on every page load.
export async function syncEmailTemplates() {
  await requirePermission(Permission.ADMIN)
  const keys = Object.keys(EMAIL_TEMPLATES)

  const rows = await prisma.email_template.findMany({
    select: { template_key: true },
  })

  const existing = new Set(rows.map((row) => row.template_key))
  const toInsert = Object.entries(EMAIL_TEMPLATES)
    .filter(([key]) => !existing.has(key))
    .map(([key, def]) => ({
      template_key: key,
      section: def.section,
      name: def.name,
      subject: def.defaults.subject,
      body: def.defaults.body,
      recipients_to: def.defaults.to,
      recipients_cc: def.defaults.cc,
      reply_to: def.defaults.replyTo,
    }))

  if (toInsert.length > 0) {
    await prisma.email_template.createMany({ data: toInsert })
  }

  await prisma.email_template.deleteMany({
    where: { template_key: { notIn: keys } },
  })
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.email_template.findMany({
    orderBy: { id: "asc" },
  })) as EmailTemplate[]
}

// No permission check on purpose: used to send the emails of the actions of any logged-in user.
export async function getEmailTemplate(
  templateKey: string,
): Promise<EmailTemplate | null> {
  return (await prisma.email_template.findUnique({
    where: { template_key: templateKey },
  })) as EmailTemplate | null
}

export async function updateEmailTemplate(template: EmailTemplate) {
  await requirePermission(Permission.ADMIN)
  await prisma.email_template.update({
    where: { template_key: template.template_key },
    data: {
      name: template.name,
      subject: template.subject,
      body: template.body,
      recipients_to: template.recipients_to,
      recipients_cc: template.recipients_cc,
      reply_to: template.reply_to,
    },
  })
}

// No permission check on purpose: used by the deferred exams form (every logged-in user).
export async function insertAbsence(absence: NewAbsence): Promise<number> {
  const created = await prisma.exam_student_absence.create({
    data: {
      sciper: absence.sciper,
      first_name: absence.first_name,
      last_name: absence.last_name,
      certificate_date_from: absence.certificate_date_from,
      certificate_date_to: absence.certificate_date_to,
      certificate_file_name: absence.certificate_file_name,
      comment: absence.comment,
      sac_has_accepted: absence.sac_has_accepted,
      sac_remark: absence.sac_remark,
    },
  })
  return created.id
}

// No permission check on purpose: used by the deferred exams form (every logged-in user).
export async function insertDiffExamSubscription(
  diffExam: NewDiffExam,
): Promise<number> {
  const created = await prisma.deferred_exam_registration.create({
    data: {
      exam_student_absence_id: diffExam.exam_student_absence_id,
      exam_code: diffExam.exam_code,
      exam_name: diffExam.exam_name,
      exam_date: diffExam.exam_date,
      isa_has_grade: diffExam.isa_has_grade,
    },
  })
  return created.id
}

export async function getAllAbsences(): Promise<Absence[]> {
  await requirePermission(Permission.SAC)
  const rows = await prisma.exam_student_absence.findMany({
    include: { deferred_exam_registration: true },
  })
  return rows.map(
    ({
      deferred_exam_registration: deferredExamRegistrations,
      ...absence
    }) => ({
      ...absence,
      deferred_exam_registrations: deferredExamRegistrations,
    }),
  ) as unknown as Absence[]
}

export async function getAbsenceCertificateFileNameById(
  id: string,
): Promise<string | null> {
  await requirePermission(Permission.SAC)
  const absenceId = Number(id)
  if (!Number.isInteger(absenceId)) return null
  const absence = await prisma.exam_student_absence.findUnique({
    where: { id: absenceId },
    select: { certificate_file_name: true },
  })
  return absence?.certificate_file_name ?? null
}

// SAC functions
export async function updateAbsenceComment(absenceId: string, value: string) {
  await requirePermission(Permission.SAC)
  await prisma.exam_student_absence.update({
    where: { id: Number(absenceId) },
    data: { comment: value },
  })
}

export async function updateAbsenceAccepted(absenceId: string, value: boolean) {
  await requirePermission(Permission.SAC)
  await prisma.exam_student_absence.update({
    where: { id: Number(absenceId) },
    data: { sac_has_accepted: value },
  })
}

export async function updateAbsenceSacRemark(absenceId: string, value: string) {
  await requirePermission(Permission.SAC)
  await prisma.exam_student_absence.update({
    where: { id: Number(absenceId) },
    data: { sac_remark: value },
  })
}

export async function updateRegistrationAccepted(
  absenceId: string,
  value: boolean,
) {
  await requirePermission(Permission.SAC)
  await prisma.deferred_exam_registration.update({
    where: { id: Number(absenceId) },
    data: { sac_has_accepted: value },
  })
}

export async function updateRegistrationSacRemark(
  absenceId: string,
  value: string,
) {
  await requirePermission(Permission.SAC)
  await prisma.deferred_exam_registration.update({
    where: { id: Number(absenceId) },
    data: { sac_remark: value },
  })
}

export async function updateRegistrationIsaHasGrade(
  absenceId: string,
  value: boolean,
) {
  await requirePermission(Permission.SAC)
  await prisma.deferred_exam_registration.update({
    where: { id: Number(absenceId) },
    data: { isa_has_grade: value },
  })
}

// Comments
export async function getAllCommentsForExam(
  examId: string,
): Promise<Comment[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.comments.findMany({
    where: { exam_id: Number(examId) },
    orderBy: { created_at: "desc" },
  })) as unknown as Comment[]
}

export async function insertComment(
  comment: Omit<Comment, "id" | "created_at">,
): Promise<number> {
  await requirePermission(Permission.ADMIN)
  const created = await prisma.comments.create({
    data: {
      exam_id: comment.exam_id,
      content: comment.content,
      registered_by: comment.registered_by,
    },
  })
  return created.id
}

export async function deleteComment(comment: Comment): Promise<number> {
  await requirePermission(Permission.ADMIN)
  const result = await prisma.comments.deleteMany({ where: { id: comment.id } })
  return result.count
}

export async function updateComment(
  comment: Pick<Comment, "id" | "content">,
): Promise<number> {
  await requirePermission(Permission.ADMIN)
  const result = await prisma.comments.updateMany({
    where: { id: comment.id },
    data: { content: comment.content },
  })
  return result.count
}

// Deferred exams management
export async function getAllDeferredSessions(): Promise<DeferredSession[]> {
  await requirePermission(Permission.ADMIN)
  return (await prisma.deferred_session.findMany()) as unknown as DeferredSession[]
}

export async function insertDeferredSession(
  deferredSession: NewDeferredSession
): Promise<DeferredSession> {
  await requirePermission(Permission.ADMIN)
  return await prisma.deferred_session.create({
    data: { name: deferredSession.name },
  })
}
