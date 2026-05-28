import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCrepExamById, updateCrepExamFiles } from "@/app/lib/crep/database";
import { deleteExamFile, getExamFolderName } from "@/app/lib/crep/upload";
import { examPrePrintStatus } from "@/app/lib/examStatus";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const examId = body?.examId;
  const filename = body?.filename;

  if (!examId || typeof filename !== "string" || !filename) {
    return NextResponse.json({ error: "Missing examId or filename" }, { status: 400 });
  }

  const exam = await getCrepExamById(String(examId));
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const contact = JSON.parse(exam.contact) as { email: string };
  if (contact.email !== session.user.email && !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!examPrePrintStatus.includes(exam.status)) {
    return NextResponse.json(
      { error: "Exam files can no longer be modified at this status" },
      { status: 409 }
    );
  }

  const files: string[] = JSON.parse(exam.files);
  if (!files.includes(filename)) {
    return NextResponse.json({ error: "File not found in exam" }, { status: 404 });
  }

  try {
    await deleteExamFile(getExamFolderName(exam), filename);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }

  const updated = files.filter((f) => f !== filename);
  await updateCrepExamFiles(String(examId), JSON.stringify(updated));

  return NextResponse.json({ ok: true, files: updated });
}
