import { FormattedAcademicYear } from "./academicYear";
import { ExamType } from "./examType";
import { FormattedSection } from "./section";

type SelectOption = { 
    value: string | number;
    label: string;
    exam: {
        code: string;
        title: string;
        teachers: { firstname: string; name: string; sciper?: string }[];
    }
};

export type Inputs = {
    examDate: string
    desiredDate: string
    nbStudents: number
    nbPages: number
    contact: string
    authorizedPersons: string
    paperFormat: string
    paperColor: string
    course: SelectOption | null
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