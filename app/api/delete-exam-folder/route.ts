// app/api/delete-exam-folder/route.ts
import { type NextRequest, NextResponse } from "next/server"

import { hasPermission, Permission } from "@/app/lib/auth/route-access"
import { getCrepExamById } from "@/app/lib/crep/database"
import { deleteExamFolder, getExamFolderName } from "@/app/lib/crep/exam-files"
import { examPrePrintStatus } from "@/app/lib/crep/exam-status"
import { auth } from "@/auth"

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs"

export async function DELETE(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // If user is not an admin
  if (!hasPermission(session.user, Permission.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await req.formData()

  const examId = formData.get("examId")

  if (!examId || typeof examId !== "string") {
    return NextResponse.json({ error: "Missing examId" }, { status: 400 })
  }

  const exam = await getCrepExamById(examId)
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  }

  if (!examPrePrintStatus.includes(exam.status)) {
    return NextResponse.json(
      {
        error:
          "The folder of this exam can no longer be deleted because the exam is already being printed or has been printed",
      },
      { status: 409 },
    )
  }

  // The folder is built on the server, never chosen by the client
  const folderName = getExamFolderName(exam)

  try {
    await deleteExamFolder(folderName)

    return NextResponse.json({
      folder_name: folderName,
    })
  } catch (err) {
    console.error(err)

    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return NextResponse.json(
        { error: "Exam folder not found", code: "FOLDER_NOT_FOUND" },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: "Failed to delete exam folder" },
      { status: 500 },
    )
  }
}
