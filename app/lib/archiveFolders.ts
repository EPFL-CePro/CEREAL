import { readdir } from "fs/promises";
import path from "path";

// Archive tree: SECTION/ACADEMIC_YEAR/PREFIX/COURSE_CODE (ex. IC/2025-2026/CS-4XX/CS-433)

// Returns the visible sub-directories of `dir`, or null if `dir` does not exist
export async function listDirectories(dir: string): Promise<string[] | null> {
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

// Returns the prefix folder containing the course in `yearDir`, or null if the course is not archived yet
export async function findCoursePrefix(yearDir: string, courseCode: string): Promise<string | null> {
    const prefixes = (await listDirectories(yearDir)) ?? [];
    for (const prefix of prefixes) {
        const courses = await listDirectories(path.join(yearDir, prefix));
        if (courses?.includes(courseCode)) return prefix;
    }
    return null;
}

// CS-433 -> CS-4XX, COM-112(a) -> COM-1XX. Null if the course code does not follow the convention.
export function computeCoursePrefix(courseCode: string): string | null {
    const match = /^([A-Za-z]+)-(\d)/.exec(courseCode);
    return match ? `${match[1]}-${match[2]}XX` : null;
}

// A single folder name, that cannot escape its parent folder
export function isSafePathSegment(segment: string): boolean {
    return (
        segment.length > 0 &&
        !segment.startsWith(".") &&
        !/[\\/\0]/.test(segment)
    );
}
