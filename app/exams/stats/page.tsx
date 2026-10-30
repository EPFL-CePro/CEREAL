import { redirect } from "next/navigation"

import { type Metadata } from "next"

import ExamsByServiceChart, {
  type ExamsByServiceSeries,
} from "@/app/components/exams/stats/ExamsByServiceChart"
import YearlyTotalChart from "@/app/components/exams/stats/YearlyTotalChart"
import {
  getAcademicYearsFromExams,
  getAllServices,
  getCopyAndPageCountsByAcademicYear,
  getExamCountsByAcademicYearAndService,
} from "@/app/lib/database"
import { auth } from "@/auth"

export const metadata: Metadata = {
  title: "Exams - Stats",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ academicYear?: string }>
}) {
  const session = await auth()
  if (!session?.user) return

  const [allAcademicYears, services, examCounts, copyAndPageCounts] =
    await Promise.all([
      getAcademicYearsFromExams(),
      getAllServices(),
      getExamCountsByAcademicYearAndService(),
      getCopyAndPageCountsByAcademicYear(),
    ])
  const latestAcademicYear = allAcademicYears[allAcademicYears.length - 1]
  const { academicYear } = await searchParams
  const selectedAcademicYear = academicYear ?? latestAcademicYear

  if (latestAcademicYear && !allAcademicYears.includes(selectedAcademicYear)) {
    redirect(`/exams/stats?academicYear=${latestAcademicYear}`)
  }

  const countsByYearAndService = new Map(
    examCounts.map(({ academicYearId, serviceId, count }) => [
      `${academicYearId}|${serviceId}`,
      count,
    ]),
  )
  const examsByServiceSeries: ExamsByServiceSeries[] = services
    .sort((a, b) => a.id - b.id)
    .map((service) => ({
      serviceId: service.id,
      label: service.code,
      counts: allAcademicYears.map(
        (year) => countsByYearAndService.get(`${year}|${service.id}`) ?? 0,
      ),
    }))

  const copiesByYear = copyAndPageCounts.map(({ academicYearId, copies }) => ({
    academicYear: academicYearId,
    total: copies,
  }))
  const pagesByYear = copyAndPageCounts.map(({ academicYearId, pages }) => ({
    academicYear: academicYearId,
    total: pages,
  }))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <ExamsByServiceChart
        academicYears={allAcademicYears}
        series={examsByServiceSeries}
      />
      <YearlyTotalChart
        title="Copies by year"
        description="Number of copies per academic year, one copy being one registered student of an exam."
        seriesLabel="Copies"
        totals={copiesByYear}
      />
      <YearlyTotalChart
        title="Pages by year"
        description="Number of pages per academic year, computed for each exam as the number of students multiplied by the number of pages per copy."
        seriesLabel="Pages"
        totals={pagesByYear}
      />
    </main>
  )
}
