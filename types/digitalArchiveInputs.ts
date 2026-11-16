import { type PapersManagement } from "@/app/lib/archive/archive-papers-management"

import { type CourseSelectOption } from "./selectOption"

export type DigitalArchiveInputs = {
  academicYear: string
  course: CourseSelectOption | null
  numberCopies: number
  papersManagement: PapersManagement
}
