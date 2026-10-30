import { type ExamType } from "./examType"
import { type CourseSelectOption } from "./selectOption"

export type Inputs = {
  examDate: string
  desiredDate: string
  contact: string
  authorizedPersons: string
  course: CourseSelectOption | null
  remark?: string
  name: string
  financialCenter: string
  registeredBy?: string
  service: string
  examType: ExamType[]
  examSemester: string
}
