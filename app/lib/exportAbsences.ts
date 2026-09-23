import * as XLSX from "xlsx";
import { Absence } from "@/types/absence";
import { DiffExam } from "@/types/diffExam";

export type ExportMode = "all" | "accepted" | "by-student" | "by-exam";

type Row = Record<string, string | number>;

function dateToString(date: Date | string) {
    return new Date(date).toLocaleDateString("fr-FR");
}

function dateToFileString(date: Date | string) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

function booleanToString(value: boolean | null | undefined) {
    if (value === null || value === undefined) return "";
    return value ? "Yes" : "No";
}

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function studentColumns(absence: Absence): Row {
    return {
        "Sciper": String(absence.sciper),
        "First name": absence.first_name,
        "Last name": absence.last_name,
    };
}

function absenceColumns(absence: Absence): Row {
    return {
        ...studentColumns(absence),
        "Begin date": dateToString(absence.certificate_date_from),
        "Ending date": dateToString(absence.certificate_date_to),
        "Comment": absence.comment ?? "",
        "Accepted": booleanToString(absence.sac_has_accepted),
        "Remark": absence.sac_remark ?? "",
        "Created on": dateToString(absence.created_at),
    };
}

function examColumns(exam?: DiffExam): Row {
    return {
        "Course code": exam?.exam_code ?? "",
        "Course name": exam?.exam_name ?? "",
        "Exam date": exam ? dateToString(exam.exam_date) : "",
        "SAC accepted": booleanToString(exam?.sac_has_accepted),
        "SAC remark": exam?.sac_remark ?? "",
        "ISA has grade": booleanToString(exam?.isa_has_grade),
    };
}

function isAcceptedRegistration(absence: Absence, exam: DiffExam) {
    return Boolean(absence.sac_has_accepted) && Boolean(exam.sac_has_accepted);
}

function absencesToRows(absences: Absence[]): Row[] {
    return absences.flatMap(absence =>
        absence.deferred_exam_registrations.length > 0
            ? absence.deferred_exam_registrations.map(exam => ({ ...absenceColumns(absence), ...examColumns(exam) }))
            : [{ ...absenceColumns(absence), ...examColumns() }]
    );
}

function acceptedRegistrations(absences: Absence[]) {
    return absences.flatMap(absence =>
        absence.deferred_exam_registrations
            .filter(exam => isAcceptedRegistration(absence, exam))
            .map(exam => ({ absence, exam }))
    );
}

function writeRows(rows: Row[], sheetName: string, fileName: string) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName.slice(0, 31));
    XLSX.writeFile(workbook, fileName);
}

/*
 Exports absences as XLSX file(s) according to the chosen mode.
 Returns false when there is nothing to export.
*/
export function exportAbsences(absences: Absence[], mode: ExportMode): boolean {
    const today = dateToFileString(new Date());

    switch (mode) {
        case "all":
        case "accepted": {
            const selected = mode === "all" ? absences : absences.filter(absence => absence.sac_has_accepted);
            const rows = absencesToRows(selected);
            if (rows.length === 0) return false;
            writeRows(rows, "Absences", `absences_${mode}_${today}.xlsx`);
            return true;
        }
        case "by-student": {
            const registrations = acceptedRegistrations(absences).sort((a, b) =>
                a.absence.last_name.localeCompare(b.absence.last_name)
                || a.absence.first_name.localeCompare(b.absence.first_name)
                || Number(a.absence.sciper) - Number(b.absence.sciper)
                || new Date(a.exam.exam_date).getTime() - new Date(b.exam.exam_date).getTime()
            );
            if (registrations.length === 0) return false;
            const rows = registrations.map(({ absence, exam }) => ({
                ...studentColumns(absence),
                "Course code": exam.exam_code,
                "Course name": exam.exam_name,
                "Exam date": dateToString(exam.exam_date),
                "SAC remark": exam.sac_remark ?? "",
            }));
            writeRows(rows, "By student", `absences_by-student_${today}.xlsx`);
            return true;
        }
        case "by-exam": {
            const groups = new Map<string, { exam: DiffExam, rows: Row[] }>();
            for (const { absence, exam } of acceptedRegistrations(absences)) {
                const key = `${exam.exam_code}_${dateToFileString(exam.exam_date)}`;
                if (!groups.has(key)) groups.set(key, { exam, rows: [] });
                groups.get(key)!.rows.push({
                    ...studentColumns(absence),
                    ...examColumns(exam)
                });
            }
            if (groups.size === 0) return false;
            for (const [key, { exam, rows }] of groups) {
                writeRows(rows, sanitizeFileName(exam.exam_code), `${sanitizeFileName(key)}.xlsx`);
            }
            return true;
        }
    }
}
