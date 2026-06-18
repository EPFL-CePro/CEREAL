import { FormattedAcademicYear } from "./academicYear";
import { ExamType } from "./examType";
import { FormattedSection } from "./section";
import { CourseSelectOption } from "./selectOption";

export type Inputs = {
    examDate: string
    desiredDate: string
    nbStudents: number
    nbPages: number
    contact: string
    authorizedPersons: string
    paperFormat: string
    paperColor: string
    course: CourseSelectOption | null
    remark?: string
    name: string
    needScan: boolean
    files?: FileList
    financialCenter: string
    registeredBy?: string
    service: string
    examType: ExamType[]
    academicYear: FormattedAcademicYear
    examSemester: string
    section: FormattedSection
    print: string
}