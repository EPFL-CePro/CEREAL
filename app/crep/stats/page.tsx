import { auth } from "@/auth";
import AcademicYearSelect from "@/app/components/crep/stats/AcademicYearSelect";
import WhoWasLateChart from "@/app/components/crep/stats/WhoWasLateChart";
import { getCrepExamsByAcademicYear } from "@/app/lib/crep/database";
import { formatDateOnlyValue } from "@/app/lib/dateTime";
import { CrepExam } from "@/types/crepExam";
import { businessDaysBetween } from "@/app/lib/businessDays";
import {
    getAcademicYearOptions,
    getCurrentAcademicYear,
    isSelectableAcademicYear,
} from "@/app/lib/academicYear";
import { redirect } from "next/navigation";

export const metadata = {
    title: "CREP - Stats",
}

function parseDate(value: Date | string | null | undefined) {
    const dateValue = formatDateOnlyValue(value);
    if (!dateValue) return null;

    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ academicYear?: string }>
}) {
    const session = await auth();
    if (!session?.user) return;

    const currentAcademicYear = getCurrentAcademicYear();
    const academicYears = getAcademicYearOptions(currentAcademicYear);
    const { academicYear } = await searchParams;
    const selectedAcademicYear = academicYear ?? currentAcademicYear;

    if (!isSelectableAcademicYear(selectedAcademicYear, currentAcademicYear)) {
        redirect(`/crep/stats?academicYear=${currentAcademicYear}`);
    }

    const exams = await getCrepExamsByAcademicYear(selectedAcademicYear) as CrepExam[];
    const timingStats = exams.reduce(
        (stats, exam) => {
            const registeredDate = parseDate(exam.created_on);
            const desiredDate = parseDate(exam.desired_date);

            if (!registeredDate || !desiredDate) {
                stats.ignored++;
                return stats;
            }

            const businessDays = businessDaysBetween(registeredDate, desiredDate);

            if (businessDays < 8) {
                stats.late++;
            } else {
                stats.onTime++;
            }

            return stats;
        },
        { late: 0, onTime: 0, ignored: 0 }
    );

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <AcademicYearSelect
                    academicYears={academicYears}
                    selectedAcademicYear={selectedAcademicYear}
                />
            </div>
            <WhoWasLateChart
                total={exams.length}
                onTime={timingStats.onTime}
                late={timingStats.late}
            />
        </main>
    )
}
