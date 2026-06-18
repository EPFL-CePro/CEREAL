export const MIN_ACADEMIC_YEAR = "2025-2026";

export function getCurrentAcademicYear(date = new Date()) {
    const month = date.getMonth();

    if (month >= 1 && month <= 8) {
        return `${date.getFullYear() - 1}-${date.getFullYear()}`;
    }

    return `${date.getFullYear()}-${date.getFullYear() + 1}`;
}

export function parseAcademicYearStart(academicYear: string) {
    const [startYear, endYear] = academicYear.split("-").map(Number);

    if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
        return null;
    }

    return startYear;
}

export function getAcademicYearDateRange(academicYear: string) {
    const startYear = parseAcademicYearStart(academicYear);
    if (!startYear) return null;

    return {
        start: new Date(startYear, 9, 1),
        end: new Date(startYear + 1, 9, 1),
    };
}

export function getAcademicYearOptions(currentAcademicYear = getCurrentAcademicYear()) {
    const minStartYear = parseAcademicYearStart(MIN_ACADEMIC_YEAR);
    const currentStartYear = parseAcademicYearStart(currentAcademicYear);

    if (!minStartYear || !currentStartYear || currentStartYear < minStartYear) {
        return [MIN_ACADEMIC_YEAR];
    }

    return Array.from(
        { length: currentStartYear - minStartYear + 1 },
        (_, index) => {
            const year = minStartYear + index;
            return `${year}-${year + 1}`;
        }
    ).reverse();
}

export function isSelectableAcademicYear(academicYear: string, currentAcademicYear = getCurrentAcademicYear()) {
    return getAcademicYearOptions(currentAcademicYear).includes(academicYear);
}
