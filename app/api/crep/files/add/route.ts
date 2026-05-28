import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCrepExamById, updateCrepExamFiles } from "@/app/lib/crep/database";
import { getExamFolderName, uploadExamFiles } from "@/app/lib/crep/upload";
import { examPrePrintStatus } from "@/app/lib/examStatus";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const examId = formData.get("examId");
  const files = formData.getAll("files") as File[];

  if (!examId || typeof examId !== "string") {
    return NextResponse.json({ error: "Missing examId" }, { status: 400 });
  }
  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const exam = await getCrepExamById(examId);
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

  const existing: string[] = JSON.parse(exam.files);
  const incomingNames = files.map((f) => f.name);
  const collisions = incomingNames.filter((n) => existing.includes(n));
  if (collisions.length > 0) {
    return NextResponse.json(
      { error: "Filename collision", collisions },
      { status: 409 }
    );
  }

  try {
    await uploadExamFiles(files, getExamFolderName(exam));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save files" }, { status: 500 });
  }

  const updated = [...existing, ...incomingNames];
  await updateCrepExamFiles(examId, JSON.stringify(updated));

  return NextResponse.json({ ok: true, files: updated });
}
