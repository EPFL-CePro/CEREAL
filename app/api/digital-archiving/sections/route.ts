import { auth } from "@/auth";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { findCoursePrefix, listDirectories } from "@/app/lib/archiveFolders";

export const runtime = "nodejs";

// Archive tree: SECTION/ACADEMIC_YEAR/PREFIX/COURSE_CODE
// - `sections`: sections having a folder for the academic year
// - `matchingSections`: sections in which the course code exists for the academic year
export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const archiveDir = process.env.ARCHIVE_EXAMS_DIR;
    if (!archiveDir) {
        return NextResponse.json({ error: "ARCHIVE_EXAMS_DIR is not set in environment variables" }, { status: 500 });
    }

    const academicYear = req.nextUrl.searchParams.get("academicYear");
    const courseCode = req.nextUrl.searchParams.get("courseCode");

    // The academic year is used to build a path, so its format is strictly checked
    if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear) || !courseCode) {
        return NextResponse.json({ error: "Missing or invalid academicYear / courseCode" }, { status: 400 });
    }

    try {
        const allSections = (await listDirectories(archiveDir)) ?? [];

        const results = await Promise.all(allSections.map(async (section) => {
            const yearDir = path.join(archiveDir, section, academicYear);
            if ((await listDirectories(yearDir)) === null) return null;

            return { section, hasCourse: (await findCoursePrefix(yearDir, courseCode)) !== null };
        }));

        const sectionsWithYear = results.filter(
            (result): result is { section: string; hasCourse: boolean } => result !== null
        );
        const sections = sectionsWithYear.map((result) => result.section).sort();
        const matchingSections = sectionsWithYear
            .filter((result) => result.hasCourse)
            .map((result) => result.section)
            .sort();

        return NextResponse.json({ sections, matchingSections });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to read the archives folder" }, { status: 500 });
    }
}
