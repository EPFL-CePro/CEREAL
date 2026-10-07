// Print settings of file in a print request
export type CrepFileSpecs = {
    exam_students: number;
    exam_pages: number;
    paper_format: string;
    paper_color: string;
    print: string;
    need_scan: boolean;
}

export type CrepFile = CrepFileSpecs & {
    id: number;
    crep_id: number;
    file_name: string | null; // null = file not uploaded yet (reserved requests)
}

export type CrepExam = {
    id: number;
    exam_code: string;
    exam_date: Date;
    exam_name: string;
    print_date: Date;
    print_duration: number; // in minutes
    remark: string;
    repro_remark: string;
    status: string;
    contact: string;
    authorized_persons: string;
    registered_by: string;
    financial_center: string;
    desired_date: Date;
    files: CrepFile[];
    boxes: number;
    price_unit: number;
    price_total: number;
    order_number: string | null;
    created_on: Date;
}