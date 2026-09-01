import { BoFileForUser } from "./boFile";

export type DiffExamFormInputs = {
    startingAbsenceDate: string;
    endingAbsenceDate: string;
    absenceFile: File[];
    diffExams: BoFileForUser[];
    comment: string;
}