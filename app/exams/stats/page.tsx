import { auth } from "@/auth";
import AcademicYearSelect from "@/app/components/AcademicYearSelect";
import ExamsByServiceChart, { ExamsByServiceSeries } from "@/app/components/exams/stats/ExamsByServiceChart";
import {
    getAcademicYearsFromExams,
    getAllServices,
    getExamCountsByAcademicYearAndService,
} from "@/app/lib/database";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Exams - Stats",
}

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ academicYear?: string }>
}) {
    const session = await auth();
    if (!session?.user) return;

    const [allAcademicYears, services, examCounts] = await Promise.all([
        getAcademicYearsFromExams(),
        getAllServices(),
        getExamCountsByAcademicYearAndService(),
    ]);
    const latestAcademicYear = allAcademicYears[allAcademicYears.length - 1];
    const { academicYear } = await searchParams;
    const selectedAcademicYear = academicYear ?? latestAcademicYear;

    if (latestAcademicYear && !allAcademicYears.includes(selectedAcademicYear)) {
        redirect(`/exams/stats?academicYear=${latestAcademicYear}`);
    }

    const countsByYearAndService = new Map(
        examCounts.map(({ academic_year_id, service_id, count }) => [`${academic_year_id}|${service_id}`, count])
    );
    const examsByServiceSeries: ExamsByServiceSeries[] = services
        .sort((a, b) => a.id - b.id)
        .map((service) => ({
            serviceId: service.id,
            label: service.code,
            counts: allAcademicYears.map(
                (year) => countsByYearAndService.get(`${year}|${service.id}`) ?? 0
            ),
        }));

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <AcademicYearSelect
                    academicYears={[...allAcademicYears].reverse()}
                    selectedAcademicYear={selectedAcademicYear}
                    basePath="/exams/stats"
                />
            </div>
            <ExamsByServiceChart
                academicYears={allAcademicYears}
                series={examsByServiceSeries}
            />
        </main>
    )
}
