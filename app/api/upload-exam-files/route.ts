// app/api/upload-exam-files/route.ts
import { type NextRequest, NextResponse } from "next/server"

import { getCrepExamById } from "@/app/lib/crep/database"
import { getExamFolderName, uploadExamFiles } from "@/app/lib/crep/exam-files"
import { examPrePrintStatus } from "@/app/lib/crep/exam-status"
import { auth } from "@/auth"

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const examId = String(formData.get("examId"))

  // Check exam + access
  const exam = await getCrepExamById(examId)
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  }

  if (exam.registered_by !== session.user.email && !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!examPrePrintStatus.includes(exam.status)) {
    return NextResponse.json(
      {
        error:
          "Exam files can no longer be modified because the exam is already being printed or has been printed",
      },
      { status: 409 },
    )
  }

  const folderName = getExamFolderName(exam)
  const files = formData.getAll("files") as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
  }

  try {
    const savedPaths = await uploadExamFiles(files, folderName)

    return NextResponse.json({
      folder_name: folderName,
      savedPaths,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to save files" }, { status: 500 })
  }
}
