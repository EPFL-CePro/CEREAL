import { parseContact } from "@/app/lib/exams/exam-contact"
import { type Exam } from "@/types/exam"
import { type ExamStatus } from "@/types/examStatus"
import { type ExamType } from "@/types/examType"
import { type Service } from "@/types/service"
import { type ServiceLevel } from "@/types/serviceLevel"
import { type Teacher } from "@/types/teacher"

export type ExamsCsvLookups = {
  teachersByCourse: Record<string, Teacher[]>
  examTypes: ExamType[]
  serviceLevels: ServiceLevel[]
  services: Service[]
  examStatus: ExamStatus[]
}

const HEADERS = [
  "ID",
  "Code",
  "Nom",
  "Enseignants",
  "Contact",
  "Date examen",
  "Type",
  "Niveau service",
  "Service",
  "Status",
  "Semestre",
  "Nombre étudiants",
  "Nombre pages",
  "Remarque",
  "Responsable",
]

// Avoiding weird things in the cell (commas, lists, ...) (mainly for the remark)
function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined || value === ""
      ? "None"
      : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function buildExamCsv(exams: Exam[], lookups: ExamsCsvLookups): string {
  const { teachersByCourse, examTypes, serviceLevels, services, examStatus } =
    lookups

  const rows = exams.map((exam) => [
    exam.id,
    exam.code,
    exam.name,
    teachersByCourse[exam.code]
      ? teachersByCourse[exam.code]
          .map((teacher) => `${teacher.firstname} ${teacher.name}`)
          .join(" | ")
      : "No teacher",
    parseContact(exam.contact)?.email,
    exam.exam_date
      ? new Date(exam.exam_date).toLocaleDateString("fr-FR")
      : "None",
    examTypes.find((element: ExamType) => element.id === exam.exam_type_id)
      ?.code,
    serviceLevels.find(
      (element: ServiceLevel) => element.id === exam.service_level_id,
    )?.name,
    services.find((element: Service) => element.id === exam.service_id)?.code,
    examStatus.find((element: ExamStatus) => element.id === exam.exam_status_id)
      ?.code,
    exam.exam_semester,
    exam.nb_students,
    exam.nb_pages,
    exam.remark,
    exam.responsible_id,
  ])

  return [HEADERS, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")
}

export function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportExamsToCsv(exams: Exam[], lookups: ExamsCsvLookups) {
  const date = new Date().toISOString().split("T")[0]
  downloadCsv(buildExamCsv(exams, lookups), `exported_exams_${date}.csv`)
}
