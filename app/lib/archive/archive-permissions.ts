import { execFile } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { fetchMultiplePersonsBySciper, fetchTeachersByCourseCode } from "@/app/lib/epfl/epfl-api";

const execFileAsync = promisify(execFile);

// Oasis placeholder for a teacher not appointed yet ("Vacat")
const SKIPPED_SCIPERS = new Set(["126096"]);

// Gives the full control of the course archive folder to the teachers of the course (Oasis), as Windows rights:
// chmod/chown have no effect on the NAS share. The rights are inherited (OI|CI) by the upload folders and the PDFs.
// smbcacls only adds the missing rights, so it is applied again on each upload of the course.
// Never throws: returns false if a teacher could not get their rights.
export async function grantTeachersFullControl(
    academicYear: string,
    courseCode: string,
    coursePath: string,
    workDir: string
): Promise<boolean> {
    try {
        const { ARCHIVE_SMB_SHARE, ARCHIVE_SMB_USERNAME, ARCHIVE_SMB_PASSWORD, ARCHIVE_SMB_DOMAIN } = process.env;
        if (!ARCHIVE_SMB_SHARE || !ARCHIVE_SMB_USERNAME || !ARCHIVE_SMB_PASSWORD || !ARCHIVE_SMB_DOMAIN) {
            console.error("ARCHIVE_SMB_SHARE, ARCHIVE_SMB_USERNAME, ARCHIVE_SMB_PASSWORD and ARCHIVE_SMB_DOMAIN must be set in environment variables");
            return false;
        }

        // Teachers resolved on the server side: a list sent by the client could give the rights to anyone
        const teachers = (await fetchTeachersByCourseCode(academicYear))[courseCode] ?? [];
        const scipers = teachers
            .map((teacher) => teacher.sciper)
            .filter((sciper): sciper is string => !!sciper && !SKIPPED_SCIPERS.has(sciper));

        if (scipers.length === 0) {
            console.error(`No teacher found in Oasis for ${courseCode} (${academicYear})`);
            return false;
        }

        const persons = await fetchMultiplePersonsBySciper(scipers.join(","));
        const usernames = new Map(persons.map((person) => [String(person.id), person.account?.username]));

        // Credentials in a file rather than in the arguments of the command (visible in the processes list)
        const authFile = path.join(workDir, "smb-auth");
        await writeFile(
            authFile,
            `username = ${ARCHIVE_SMB_USERNAME}\npassword = ${ARCHIVE_SMB_PASSWORD}\ndomain = ${ARCHIVE_SMB_DOMAIN}\n`,
            { mode: 0o600 }
        );

        // Path inside the share, with Windows separators
        const smbPath = coursePath.split(path.sep).join("\\");

        const results = await Promise.all(scipers.map(async (sciper) => {
            const username = usernames.get(sciper);
            if (!username) {
                console.error(`No username found for sciper ${sciper}, no rights given on ${coursePath}`);
                return false;
            }

            try {
                await execFileAsync("smbcacls", [
                    ARCHIVE_SMB_SHARE,
                    smbPath,
                    "-A", authFile,
                    // Only the DACL is sent back (as the old Windows script): by default smbcacls also sends the owner,
                    // which the NAS refuses (NT_STATUS_INVALID_OWNER)
                    "--set-security-info=4",
                    "-a",`ACL:${ARCHIVE_SMB_DOMAIN}\\${username}:ALLOWED/OI|CI/FULL`,
                ], { timeout: 30_000 });
                return true;
            } catch (err) {
                // smbcacls writes part of its errors on stdout (ex. "Failed to parse acl"), not in the error message
                const { code, stdout, stderr } = err as { code?: number | string; stdout?: string; stderr?: string };
                console.error(
                    `Unable to give the rights to ${username} on ${coursePath} (exit code: ${code})\n` +
                    `stdout: ${stdout?.trim() || "-"}\nstderr: ${stderr?.trim() || "-"}`
                );
                return false;
            }
        }));

        return results.every(Boolean);
    } catch (err) {
        console.error(`Unable to give the rights to the teachers of ${courseCode} on ${coursePath}`, err);
        return false;
    }
}
