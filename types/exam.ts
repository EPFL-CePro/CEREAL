export type Exam = {
    id: string;
    code: string;
    name: string;
    service_level_id: number;
    service_id: number;
    exam_type_id: number;
    exam_status_id: number;
    exam_date?: string | Date | null;
    academic_year_id: string;
    exam_semester: number;
    nb_students?: number | null;
    nb_pages?: number | null;
    total_pages?: number | null;
    // deadline_prep: string | Date;
    // deadline_repro: string | Date;
    remark?: string | null;
    responsible_id: number | null;
    contact: string;
}

export type NewExam = Omit<Exam, 'id'>;
