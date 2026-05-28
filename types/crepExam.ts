export type CrepExam = {
    id: number;
    exam_code: string;
    exam_date: Date;
    exam_name: string;
    exam_pages: number;
    exam_students: number;
    print_date: Date;
    remark: string;
    repro_remark: string;
    status: string;
    paper_format: string;
    paper_color: string;
    contact: string;
    authorized_persons: string;
    registered_by: string;
    need_scan: boolean;
    financial_center: string;
    desired_date: Date;
    files: string;
}