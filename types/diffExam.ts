export type DiffExam = {
    id: string;
    exam_student_absence_id: Number;
    exam_code: string;
    exam_name: string;
    exam_date: Date;
    isa_has_grade: boolean;
}

export type NewDiffExam = Omit<DiffExam, 'id'>;