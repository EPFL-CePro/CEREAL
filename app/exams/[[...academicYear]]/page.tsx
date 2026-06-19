import { auth } from "@/auth";
import ExamsTable from "../../components/exams/ExamsTable";
import { getAcademicYearsFromExams } from "@/app/lib/database";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Exams table",
}

export default async function Page({
    params,
}: {
    params: Promise<{ academicYear?: string[] }>
}) {
    const session = await auth();
    if (!session?.user) return;

    const { academicYear } = await params;
    const selectedAcademicYear = academicYear?.[0];
    const allAcademicYears = await getAcademicYearsFromExams();
    const academicYearExists = allAcademicYears.some(item => item == selectedAcademicYear);
    if(!selectedAcademicYear || !academicYearExists) {
        redirect(`/exams/${allAcademicYears[allAcademicYears.length - 1]}`)
    }

    return (
        <main>
            <ExamsTable academicYear={selectedAcademicYear}/>
        </main>
    )
}
