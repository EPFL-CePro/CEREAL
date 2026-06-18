import { auth } from "@/auth";
import WhoWasLateChart from "@/app/components/crep/stats/WhoWasLateChart";
import { getAllCrepExams } from "@/app/lib/crep/database";
import { formatDateOnlyValue } from "@/app/lib/dateTime";
import { CrepExam } from "@/types/crepExam";
import { businessDaysBetween } from "@/app/lib/businessDays";

export const metadata = {
    title: "CREP - Stats",
}

function parseDate(value: Date | string | null | undefined) {
    const dateValue = formatDateOnlyValue(value);
    if (!dateValue) return null;

    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) return;

    const exams = await getAllCrepExams() as CrepExam[];
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
            <WhoWasLateChart
                total={exams.length}
                onTime={timingStats.onTime}
                late={timingStats.late}
            />
        </main>
    )
}
