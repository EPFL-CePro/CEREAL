// app/lib/upload-exam-files.ts
import { mkdir, rm, unlink, writeFile } from "fs/promises"
import path from "path"

import { safeJoinPath } from "@/app/lib/files/safe-path"
import { type CrepExam } from "@/types/crepExam"
import { type Exam } from "@/types/exam"

import { formatDateOnlyValue } from "../dates/date-time"

const EXAM_FILES_UPLOAD_FOLDER = process.env.EXAM_FILES_UPLOAD_FOLDER

function getExamFilesFolder(): string {
  if (!EXAM_FILES_UPLOAD_FOLDER) {
    throw new Error(
      "EXAM_FILES_UPLOAD_FOLDER is not set in environment variables",
    )
  }
  return EXAM_FILES_UPLOAD_FOLDER
}

// The contact is stored as a JSON string in the database.
export function getExamContact(exam: CrepExam): Exam["contact"] {
  return JSON.parse(exam.contact) as Exam["contact"]
}

export function getExamFolderName(exam: CrepExam): string {
  const contact = getExamContact(exam)
  const desired = formatDateOnlyValue(exam.desired_date)
  return `${exam.id}_${exam.exam_code}_${contact.lastname}_${desired}`
}

export async function deleteExamFile(
  folderName: string,
  filename: string,
): Promise<void> {
  if (
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..")
  ) {
    throw new Error("Invalid filename")
  }
  if (
    folderName.includes("/") ||
    folderName.includes("\\") ||
    folderName.includes("..")
  ) {
    throw new Error("Invalid folder name")
  }
  const filePath = safeJoinPath(getExamFilesFolder(), folderName, filename)
  await unlink(filePath)
}

export async function uploadExamFiles(
  files: File[],
  folderName: string,
): Promise<string[]> {
  const examDir = safeJoinPath(getExamFilesFolder(), folderName)

  //create folder
  await mkdir(examDir, { recursive: true })

  const savedPaths: string[] = []
  // TODO : Maybe check the file type ? size ?
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filePath = safeJoinPath(examDir, file.name)

    await writeFile(filePath, buffer)
    savedPaths.push(filePath)
  }

  return savedPaths
}

export async function deleteExamFolder(folderName: string): Promise<void> {
  const examDir = safeJoinPath(getExamFilesFolder(), folderName)
  if (examDir === path.resolve(getExamFilesFolder())) {
    throw new Error("Cannot delete root upload directory")
  }

  // Check the exam folder
  await rm(examDir, { recursive: true })
}
