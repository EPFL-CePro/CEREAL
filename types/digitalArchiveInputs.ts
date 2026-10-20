import { CourseSelectOption } from "./selectOption";

export type DigitalArchiveInputs = {
    academicYear: string;
    course: CourseSelectOption | null;
    numberCopies: number;
    papersManagement: string;
}