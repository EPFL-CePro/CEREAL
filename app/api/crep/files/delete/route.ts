import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteCrepFile } from "@/app/lib/crep/database";
import { deleteExamFile, getExamFolderName } from "@/app/lib/crep/upload";
import { checkCrepFileAccess } from "@/app/lib/crep/fileAccess";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();

  const body = await req.json().catch(() => null);
  const examId = body?.examId;
  const fileId = Number(body?.fileId);

  if (!examId || !Number.isInteger(fileId)) {
    return NextResponse.json({ error: "Missing examId or fileId" }, { status: 400 });
  }

  const access = await checkCrepFileAccess(session, String(examId));
  if (!access.exam) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { exam } = access;

  const file = exam.files.find((f) => f.id === fileId);
  if (!file) {
    return NextResponse.json({ error: "File not found in exam" }, { status: 404 });
  }

  if (exam.files.length <= 1) {
    return NextResponse.json(
      { error: "A request needs at least one file. Add the new file before deleting this one." },
      { status: 409 }
    );
  }

  // A file that is not uploaded yet (reserved exam) only exists in the database
  if (file.file_name) {
    try {
      await deleteExamFile(getExamFolderName(exam), file.file_name);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
  }

  await deleteCrepFile(exam.id, file.id);

  return NextResponse.json({ ok: true });
}
