import { auth } from "@/auth";
import { readdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Returns the visible sub-directories of `dir`, or null if `dir` does not exist
async function listDirectories(dir: string): Promise<string[] | null> {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
            .map((entry) => entry.name);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
    }
}

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
            const prefixes = await listDirectories(yearDir);
            if (prefixes === null) return null;

            for (const prefix of prefixes) {
                const courses = await listDirectories(path.join(yearDir, prefix));
                if (courses?.includes(courseCode)) return { section, hasCourse: true };
            }
            return { section, hasCourse: false };
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
