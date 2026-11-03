const ACADEMIC_YEAR_START_MONTH = 8 // September (0-indexed)

export function getCurrentAcademicYear(date = new Date()) {
  const startYear =
    date.getMonth() >= ACADEMIC_YEAR_START_MONTH
      ? date.getFullYear()
      : date.getFullYear() - 1
  return `${startYear}-${startYear + 1}`
}

export function parseAcademicYearStart(academicYear: string) {
  const [startYear, endYear] = academicYear.split("-").map(Number)

  if (
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    endYear !== startYear + 1
  ) {
    return null
  }

  return startYear
}

export function getAcademicYearDateRange(academicYear: string) {
  const startYear = parseAcademicYearStart(academicYear)
  if (!startYear) return null

  return {
    start: new Date(startYear, ACADEMIC_YEAR_START_MONTH, 1),
    end: new Date(startYear + 1, ACADEMIC_YEAR_START_MONTH, 1),
  }
}

export function getAcademicYearOptions(
  minAcademicYear: string,
  currentAcademicYear = getCurrentAcademicYear(),
) {
  const minStartYear = parseAcademicYearStart(minAcademicYear)
  const currentStartYear = parseAcademicYearStart(currentAcademicYear)

  if (!minStartYear || !currentStartYear || currentStartYear < minStartYear) {
    return [currentAcademicYear]
  }

  return Array.from(
    { length: currentStartYear - minStartYear + 1 },
    (_, index) => {
      const year = minStartYear + index
      return `${year}-${year + 1}`
    },
  ).reverse()
}

export function isSelectableAcademicYear(
  academicYear: string,
  minAcademicYear: string,
  currentAcademicYear = getCurrentAcademicYear(),
) {
  return getAcademicYearOptions(minAcademicYear, currentAcademicYear).includes(
    academicYear,
  )
}
