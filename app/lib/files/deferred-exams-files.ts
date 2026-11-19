import { randomUUID } from "crypto"
import {
  mkdir,
  writeFile,
  readdir,
  access,
  constants,
  rename,
  stat,
  readFile,
} from "fs/promises"
import path from "path"

import * as XLSX from "xlsx"

import { safeJoinPath } from "@/app/lib/files/safe-path"
import { type BoFileForUser, type XLSXFile } from "@/types/boFile"

const DEFFERED_EXAMS_DIR = process.env.DEFFERED_EXAMS_DIR

function getDeferredExamsDir(): string {
  if (!DEFFERED_EXAMS_DIR) {
    throw new Error("DEFFERED_EXAMS_DIR is not set in environment variables")
  }
  return DEFFERED_EXAMS_DIR
}

// date-formatted cells are converted to an ISO string.
function dateCellToIso(cell: XLSX.CellObject | undefined): string | null {
  if (
    cell?.t !== "n" ||
    typeof cell.v !== "number" ||
    !XLSX.SSF.is_date(cell.z)
  )
    return null

  const parsedDate = XLSX.SSF.parse_date_code(cell.v)
  if (!parsedDate) return null

  return new Date(
    Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d),
  ).toISOString()
}

function getSheetHeaders(sheet: XLSX.WorkSheet, range: XLSX.Range): string[] {
  return Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => {
    const cell =
      sheet[XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c + index })]
    const value = cell?.v
    return value === undefined || value === null ? "" : String(value)
  })
}

export async function uploadXLSXFile(
  file: File,
  folderName: string,
): Promise<string> {
  const xlsxDirectory = safeJoinPath(getDeferredExamsDir(), folderName)

  //create folder
  await mkdir(xlsxDirectory, { recursive: true })

  const existingXLSXFile = await checkExistingXLSXFile(folderName)

  if (existingXLSXFile) {
    const existingXLSXPath = safeJoinPath(xlsxDirectory, existingXLSXFile)
    const backupXLSXFolderPath = safeJoinPath(xlsxDirectory, "old")

    await mkdir(backupXLSXFolderPath, { recursive: true })

    const backupExistingFilePath = safeJoinPath(
      backupXLSXFolderPath,
      existingXLSXFile,
    )
    await rename(existingXLSXPath, backupExistingFilePath)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const filePath = safeJoinPath(xlsxDirectory, file.name)

  await writeFile(filePath, buffer)

  return filePath
}

export async function checkExistingXLSXFile(
  folderName: string,
): Promise<string> {
  const xlsxDirectory = safeJoinPath(getDeferredExamsDir(), folderName)

  try {
    await access(xlsxDirectory, constants.R_OK | constants.W_OK)
  } catch {
    return ""
  }

  const dir = await readdir(xlsxDirectory)
  const dirWithoutBackupFolder = dir.filter((name) => name !== "old")

  if (dirWithoutBackupFolder.length === 0) {
    return ""
  } else if (dirWithoutBackupFolder.length > 1) {
    throw new Error(
      `Multiple files found in folder ${xlsxDirectory.toString()}`,
    )
  }

  return dirWithoutBackupFolder[0]
}

export async function getExistingXLSXFile(
  folderName: string,
): Promise<XLSXFile | null> {
  const name = await checkExistingXLSXFile(folderName)
  if (!name) return null

  const filePath = safeJoinPath(getDeferredExamsDir(), folderName, name)
  const [fileStats, buffer] = await Promise.all([
    stat(filePath),
    readFile(filePath),
  ])
  const workbook = XLSX.read(buffer, { type: "buffer", cellNF: true })
  const firstSheetName = workbook.SheetNames[0] ?? ""
  const firstSheet = firstSheetName
    ? workbook.Sheets[firstSheetName]
    : undefined
  const rowCount = firstSheet?.["!ref"]
    ? XLSX.utils.decode_range(firstSheet["!ref"]).e.r + 1
    : 0

  const content = firstSheet
    ? (XLSX.utils.sheet_to_json(firstSheet, {
        defval: null,
        raw: true,
      }) as Record<string, unknown>[])
    : []

  if (firstSheet?.["!ref"]) {
    const range = XLSX.utils.decode_range(firstSheet["!ref"])
    const headers = getSheetHeaders(firstSheet, range)

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const contentRow = content[row - range.s.r - 1]
      if (!contentRow) continue

      for (let col = range.s.c; col <= range.e.c; col++) {
        const header = headers[col - range.s.c]
        if (!header) continue

        const isoDate = dateCellToIso(
          firstSheet[XLSX.utils.encode_cell({ r: row, c: col })],
        )
        if (isoDate) contentRow[header] = isoDate
      }
    }
  }

  return {
    name,
    size: fileStats.size,
    lastModified: fileStats.mtime.toISOString(),
    firstSheetName,
    rowCount,
    content,
  }
}

export async function getExistingXLSXFileMetadata(
  folderName: string,
): Promise<Omit<XLSXFile, "content"> | null> {
  const name = await checkExistingXLSXFile(folderName)
  if (!name) return null

  const filePath = safeJoinPath(getDeferredExamsDir(), folderName, name)
  const [fileStats, buffer] = await Promise.all([
    stat(filePath),
    readFile(filePath),
  ])
  const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 1 })
  const firstSheetName = workbook.SheetNames[0] ?? ""
  const firstSheet = firstSheetName
    ? workbook.Sheets[firstSheetName]
    : undefined
  const sheetRange = firstSheet?.["!fullref"] ?? firstSheet?.["!ref"]
  const rowCount = sheetRange ? XLSX.utils.decode_range(sheetRange).e.r + 1 : 0

  return {
    name,
    size: fileStats.size,
    lastModified: fileStats.mtime.toISOString(),
    firstSheetName,
    rowCount,
  }
}

// First sheet of the uploaded BO file (null if no BO file is uploaded)
async function readBOFirstSheet(): Promise<XLSX.WorkSheet | undefined | null> {
  const name = await checkExistingXLSXFile("BO")
  if (!name) return null

  const filePath = safeJoinPath(getDeferredExamsDir(), "BO", name)
  const buffer = await readFile(filePath)
  const workbook = XLSX.read(buffer, { type: "buffer", cellNF: true })
  const firstSheetName = workbook.SheetNames[0] ?? ""
  return firstSheetName ? workbook.Sheets[firstSheetName] : undefined
}

export async function getBOFileRowsForSciper(
  sciper: string,
): Promise<BoFileForUser[] | null> {
  const firstSheet = await readBOFirstSheet()
  if (firstSheet === null) return null
  if (!firstSheet?.["!ref"]) return []

  const range = XLSX.utils.decode_range(firstSheet["!ref"])
  const rawHeaders = getSheetHeaders(firstSheet, range)
  const headers = rawHeaders.map((header, index) => {
    const normalizedHeader = header || "__EMPTY"
    const previousHeaderCount = rawHeaders
      .slice(0, index)
      .filter(
        (previousHeader) => (previousHeader || "__EMPTY") === normalizedHeader,
      ).length

    return previousHeaderCount === 0
      ? normalizedHeader
      : `${normalizedHeader}_${previousHeaderCount}`
  })
  const sciperIndex = rawHeaders.indexOf("SCIPER")
  if (sciperIndex === -1) return []

  const rows: BoFileForUser[] = []
  const sciperColumn = range.s.c + sciperIndex

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const sciperCell =
      firstSheet[XLSX.utils.encode_cell({ r: row, c: sciperColumn })]
    if (String(sciperCell?.v ?? "") !== sciper) continue

    const rowContent: Record<string, unknown> = {}

    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerIndex = col - range.s.c
      if (!rawHeaders[headerIndex]) continue

      const header = headers[headerIndex]

      const cell = firstSheet[XLSX.utils.encode_cell({ r: row, c: col })]
      rowContent[header] = dateCellToIso(cell) ?? cell?.v ?? null
    }

    rows.push(rowContent as BoFileForUser)
  }

  return rows
}
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const getAbsencesDir = () => safeJoinPath(getDeferredExamsDir(), "certificates")
const ALLOWED_FILE_TYPES: Record<string, string> = {
  // Extension, MIME type
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
}

// Ordinary exam date (ISO string, UTC midnight) of each exam code of the BO file
export async function getBOFileOrdinaryExamDates(): Promise<
  Map<string, string>
> {
  const dates = new Map<string, string>()
  const firstSheet = await readBOFirstSheet()
  if (!firstSheet?.["!ref"]) return dates

  const range = XLSX.utils.decode_range(firstSheet["!ref"])
  const headers = getSheetHeaders(firstSheet, range)
  const codeIndex = headers.indexOf(
    "codification matière (indépendant du plan)",
  )
  const dateIndex = headers.indexOf("date séance")
  if (codeIndex === -1 || dateIndex === -1) return dates

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const code =
      firstSheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + codeIndex })]
        ?.v
    const date = dateCellToIso(
      firstSheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + dateIndex })],
    )
    if (!code || !date) continue

    // An exam has a single ordinary date: keep the latest one, just in case
    const key = String(code)
    const known = dates.get(key)
    if (!known || date > known) dates.set(key, date)
  }

  return dates
}

export async function uploadAbsenceFile(file: File): Promise<string> {
  if (file.size === 0) throw new Error("The file is empty")
  if (file.size > MAX_FILE_SIZE)
    throw new Error("The file is too large (max 10MB)")

  // Check file type
  const extension = path.extname(file.name).toLowerCase()
  if (ALLOWED_FILE_TYPES[extension] !== file.type) {
    throw new Error(
      `Invalid file type. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(", ")}`,
    )
  }

  // Create folder if it doesn't exist
  await mkdir(getAbsencesDir(), { recursive: true })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Unique name
  const fileName = `${randomUUID()}${extension}`
  const filePath = safeJoinPath(getAbsencesDir(), fileName)
  await writeFile(filePath, buffer, { flag: "wx" }) // wx, fails if the file already exists

  return fileName
}
