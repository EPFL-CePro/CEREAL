export type DiffExam = {
    id: string;
    exam_student_absence_id: number;
    exam_code: string;
    exam_name: string;
    exam_date: Date;
    isa_has_grade: boolean;
    sac_has_accepted: boolean;
    sac_remark: string;
}

export type NewDiffExam = Omit<DiffExam, 'id' | 'sac_has_accepted' | 'sac_remark'>;
