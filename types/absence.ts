import type { DiffExam } from "./diffExam";

export type Absence = {
    id: string;
    sciper: Number;
    first_name: string;
    last_name: string;
    certificate_date_from: Date;
    certificate_date_to: Date;
    certificate_file_name: string;
    comment: string;
    sac_has_accepted: boolean;
    sac_remark: string;
    created_at: Date;
    deferred_exam_registrations: DiffExam[];
}

export type NewAbsence = Omit<Absence, 'id' | 'created_at' | 'deferred_exam_registrations'>;
