import path from "path";

// Archive tree: CODE_PREFIX/ACADEMIC_YEAR/CODE_GROUP/COURSE_CODE (ex. CS/2025-2026/CS-4XX/CS-433)

// CS-433 -> CS/2025-2026/CS-4XX/CS-433, CMS-ADM1 -> CMS/2025-2026/CMS-AXX/CMS-ADM1. Null if the course code has no "-".
export function courseArchivePath(academicYear: string, courseCode: string): string | null {
    const match = /^([^-]+)-(.)/.exec(courseCode);
    if (!match) return null;

    const [, codePrefix, firstChar] = match;
    return path.join(codePrefix, academicYear, `${codePrefix}-${firstChar}XX`, courseCode);
}

// A single folder name, that cannot escape its parent folder
export function isSafePathSegment(segment: string): boolean {
    return (
        segment.length > 0 &&
        !segment.startsWith(".") &&
        !/[\\/\0]/.test(segment)
    );
}
