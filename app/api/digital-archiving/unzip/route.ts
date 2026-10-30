import { execFile } from "child_process"
import { createWriteStream } from "fs"
import {
  chmod,
  chown,
  mkdtemp,
  mkdir,
  readdir,
  rm,
  rmdir,
  stat,
} from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import { promisify } from "util"

import { type NextRequest, NextResponse } from "next/server"

import {
  courseArchivePath,
  isSafePathSegment,
} from "@/app/lib/archive/archive-folders"
import { grantTeachersFullControl } from "@/app/lib/archive/archive-permissions"
import { auth } from "@/auth"

import type { ReadableStream } from "stream/web"

export const runtime = "nodejs"

const execFileAsync = promisify(execFile)
const archiveDir = process.env.ARCHIVE_EXAMS_DIR

// macOS metadata, never extracted
const IGNORED_ENTRIES = ["__MACOSX/*", "._*", "*/._*"]

function isUnsafeZipEntry(entry: string) {
  return (
    entry.startsWith("/") ||
    entry.startsWith("\\") ||
    entry.split(/[\\/]+/).some((segment) => segment === "..") ||
    path.isAbsolute(entry)
  )
}

function isArchivedPdf(entry: string) {
  const baseName = path.posix.basename(entry)
  return (
    entry.toLowerCase().endsWith(".pdf") &&
    !entry.startsWith("__MACOSX/") &&
    !baseName.startsWith("._")
  )
}

// Swiss time (the container runs in UTC), ex. 2026_10_15_115900
function uploadFolderName(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zurich",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}_${parts.month}_${parts.day}_${parts.hour}${parts.minute}${parts.second}`
}

// The server runs as root in Docker and unzip keeps the rights stored in the ZIP:
// without this, the archived PDFs would belong to root and be unreadable by the archive owner
async function giveToArchiveOwner(
  rootDir: string,
  dirs: string[],
  uploadDir: string,
) {
  const { uid, gid } = await stat(rootDir)
  const files = (await readdir(uploadDir)).map((file) =>
    path.join(uploadDir, file),
  )

  await Promise.all([
    ...dirs.map(async (dir) => {
      await chown(dir, uid, gid)
      await chmod(dir, 0o770)
    }),
    ...files.map(async (file) => {
      await chown(file, uid, gid)
      await chmod(file, 0o660)
    }),
  ])
}

// Archive tree: CODE_PREFIX/ACADEMIC_YEAR/CODE_GROUP/COURSE_CODE/UPLOAD_TIMESTAMP (missing folders are created)
// Each upload is extracted flat inside its own timestamped folder: the previous archives of the course are never touched
export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!archiveDir) {
    return NextResponse.json(
      { error: "ARCHIVE_EXAMS_DIR is not set in environment variables" },
      { status: 500 },
    )
  }

  if (!req.body) {
    return NextResponse.json({ error: "Missing ZIP file" }, { status: 400 })
  }

  let fileName: string
  try {
    fileName = decodeURIComponent(req.headers.get("x-archive-name") ?? "")
  } catch {
    return NextResponse.json({ error: "Invalid ZIP filename" }, { status: 400 })
  }

  if (!fileName.toLowerCase().endsWith(".zip")) {
    return NextResponse.json(
      { error: "The uploaded file must be a ZIP" },
      { status: 400 },
    )
  }

  const params = req.nextUrl.searchParams
  const numberCopies = Number(params.get("numberCopies"))
  const academicYear = params.get("academicYear") ?? ""
  const courseCode = params.get("courseCode") ?? ""

  if (!Number.isInteger(numberCopies) || numberCopies <= 0) {
    return NextResponse.json(
      { error: "Specify a `numberCopies` param (ex. 300)" },
      { status: 400 },
    )
  }

  // These params are used to build the destination path, so their format is strictly checked
  if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    return NextResponse.json(
      { error: "Missing or invalid `academicYear` param (ex. 2025-2026)" },
      { status: 400 },
    )
  }

  const coursePath = isSafePathSegment(courseCode)
    ? courseArchivePath(academicYear, courseCode)
    : null
  if (!coursePath) {
    return NextResponse.json(
      { error: "Missing or invalid `courseCode` param (ex. CS-433)" },
      { status: 400 },
    )
  }

  const courseDir = path.join(archiveDir, coursePath)
  const tempDir = await mkdtemp(path.join(tmpdir(), "cereal-digital-archive-"))
  const tempZipPath = path.join(tempDir, "upload.zip")
  // Folders created by this upload, removed if it fails
  let uploadDir: string | null = null
  const createdDirs: string[] = []

  try {
    await pipeline(
      Readable.fromWeb(req.body as unknown as ReadableStream<Uint8Array>),
      createWriteStream(tempZipPath),
    )

    const { stdout } = await execFileAsync("unzip", ["-Z", "-1", tempZipPath], {
      maxBuffer: 1024 * 1024 * 20,
    })
    const entries = stdout.split(/\r?\n/).filter(Boolean)
    const unsafeEntry = entries.find(isUnsafeZipEntry)

    if (unsafeEntry) {
      return NextResponse.json(
        { error: `Unsafe path in ZIP: ${unsafeEntry}` },
        { status: 400 },
      )
    }

    const pdfs = entries.filter(isArchivedPdf)

    if (pdfs.length !== numberCopies) {
      return NextResponse.json(
        {
          error: `The number of copies must be equal to the number of PDFs files inside the ZIP. Specified number of copies : ${numberCopies}, number of PDFs files : ${pdfs.length}`,
        },
        { status: 400 },
      )
    }

    // The ZIP is extracted flat: two PDFs with the same name in different folders would overwrite each other
    const seenNames = new Set<string>()
    const duplicatedName = pdfs
      .map((pdf) => path.posix.basename(pdf))
      .find((name) => {
        if (seenNames.has(name)) return true
        seenNames.add(name)
        return false
      })

    if (duplicatedName) {
      return NextResponse.json(
        { error: `Several PDFs are named ${duplicatedName} inside the ZIP` },
        { status: 400 },
      )
    }

    // mkdir returns the first folder it had to create: the folders created by this upload are this one and its children
    const firstCreatedDir = await mkdir(courseDir, { recursive: true })
    if (firstCreatedDir) {
      for (let dir = courseDir; ; dir = path.dirname(dir)) {
        createdDirs.push(dir)
        if (dir === firstCreatedDir) break
      }
    }

    const newUploadDir = path.join(courseDir, uploadFolderName(new Date()))
    try {
      // Not recursive, so that two simultaneous uploads of the same course cannot extract into the same folder
      await mkdir(newUploadDir)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err
      return NextResponse.json(
        {
          error: `Another archive of the exam ${courseCode} has just been uploaded, try again in a few seconds`,
        },
        { status: 409 },
      )
    }
    uploadDir = newUploadDir

    const start = performance.now()
    // -j: flatten the ZIP folders, -n: never overwrite, -C: case-insensitive patterns (.pdf / .PDF)
    await execFileAsync(
      "unzip",
      [
        "-q",
        "-j",
        "-n",
        "-C",
        tempZipPath,
        "*.pdf",
        "-x",
        ...IGNORED_ENTRIES,
        "-d",
        newUploadDir,
      ],
      {
        maxBuffer: 1024 * 1024 * 20,
      },
    )
    const durationMs = Math.round(performance.now() - start)

    // On a NAS share, the ownership can be forced by the mount options and chown refused: the extraction is still valid
    await giveToArchiveOwner(
      archiveDir,
      [newUploadDir, ...createdDirs],
      newUploadDir,
    ).catch((ownerErr) =>
      console.error(
        "Unable to give the archived files to the archive owner",
        ownerErr,
      ),
    )

    // The archive is kept even without the teachers rights: the page asks to warn CePro
    const permissionsGranted = await grantTeachersFullControl(
      academicYear,
      courseCode,
      coursePath,
      tempDir,
    )

    return NextResponse.json({
      fileName,
      destination: coursePath,
      numberOfPdfs: pdfs.length,
      durationMs,
      durationSeconds: durationMs / 1000,
      permissionsGranted,
    })
  } catch (err) {
    console.error(err)

    // Do not leave a partially extracted archive
    if (uploadDir) {
      await rm(uploadDir, { recursive: true, force: true }).catch(
        (cleanupErr) => console.error(cleanupErr),
      )
    }
    // Nor the empty parent folders created for it (rmdir refuses a folder filled in the meantime by another upload)
    for (const dir of createdDirs) {
      if (
        await rmdir(dir).then(
          () => false,
          () => true,
        )
      )
        break
    }

    const message =
      err instanceof Error ? err.message : "Failed to unzip archive"
    const code = (err as NodeJS.ErrnoException | null)?.code
    let error = message

    // Check unzip error message
    if (code === "EROFS")
      error = "The NAS folder is mounted in read-only. Enable read and write."
    else if (code === "EACCES")
      error =
        "The server does not have the necessary rights of writing inside the NAS folder."
    else if (message.includes("ENOENT"))
      error = "The unzip command is not available"

    return NextResponse.json({ error }, { status: 500 })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
